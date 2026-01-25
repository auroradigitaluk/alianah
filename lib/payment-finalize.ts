import { prisma } from "@/lib/prisma"
import {
  sendDonationConfirmationEmail,
  sendFundraiserDonationNotification,
  sendSponsorshipDonationEmail,
  sendWaterProjectDonationEmail,
} from "@/lib/email"
import { createPortalToken } from "@/lib/portal-token"

export async function finalizeOrderByOrderNumber(params: {
  orderNumber: string
  paidAt: Date
  paymentRef: string | null
  isSubscription: boolean
  customerEmail: string | null
  nextPaymentDate?: Date | null
}) {
  const { orderNumber, paidAt, paymentRef, isSubscription, customerEmail, nextPaymentDate } = params

  const order = await prisma.demoOrder.findUnique({
    where: { orderNumber },
    include: { items: true },
  })

  if (!order) return

  const wasAlreadyCompleted = order.status === "COMPLETED"

  // Grab pending appeal donations for fundraiser notifications (before we mark complete)
  const pendingDonations = await prisma.donation.findMany({
    where: {
      orderNumber,
      status: "PENDING",
    },
    include: {
      donor: true,
      fundraiser: {
        include: {
          appeal: { select: { title: true } },
        },
      },
    },
  })

  await prisma.donation.updateMany({
    where: { orderNumber, status: "PENDING" },
    data: {
      status: "COMPLETED",
      completedAt: paidAt,
      ...(paymentRef ? { transactionId: paymentRef } : {}),
    },
  })

  await prisma.demoOrder.update({
    where: { orderNumber },
    data: { status: "COMPLETED" },
  })

  if (isSubscription && paymentRef) {
    await prisma.recurringDonation.updateMany({
      where: { subscriptionId: paymentRef },
      data: {
        status: "ACTIVE",
        lastPaymentDate: paidAt,
        ...(nextPaymentDate ? { nextPaymentDate } : {}),
      },
    })
  }

  // Send donor confirmation email once
  if (!wasAlreadyCompleted) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const manageSubscriptionUrl =
        isSubscription && customerEmail
          ? `${baseUrl}/manage-subscription?token=${encodeURIComponent(
              createPortalToken(customerEmail, 60 * 60)
            )}`
          : undefined

      await sendDonationConfirmationEmail({
        donorEmail: order.donorEmail,
        donorName: `${order.donorFirstName} ${order.donorLastName}`,
        orderNumber: order.orderNumber,
        items: order.items.map((i) => ({
          title: i.productName ? `${i.appealTitle} • ${i.productName}` : i.appealTitle,
          amountPence: i.amountPence,
          frequency: i.frequency,
        })),
        totalPence: order.totalPence,
        giftAid: order.giftAid,
        ...(manageSubscriptionUrl ? { manageSubscriptionUrl } : {}),
      })
    } catch (err) {
      console.error("Error sending donation confirmation email:", err)
    }
  }

  // Mark water project + sponsorship donations for this order as paid and send emails
  const orderToken = `OrderNumber:${orderNumber}`
  const [waterDonations, sponsorshipDonations] = await Promise.all([
    prisma.waterProjectDonation.findMany({
      where: { notes: { contains: orderToken } },
      include: { donor: true, country: true, waterProject: true },
    }),
    prisma.sponsorshipDonation.findMany({
      where: { notes: { contains: orderToken } },
      include: { donor: true, country: true, sponsorshipProject: true },
    }),
  ])

  for (const donation of waterDonations) {
    if ((donation.status ?? "PENDING") === "PENDING" || !donation.transactionId) {
      await prisma.waterProjectDonation.update({
        where: { id: donation.id },
        data: {
          status: donation.status && donation.status !== "PENDING" ? donation.status : "WAITING_TO_REVIEW",
          ...(paymentRef && !donation.transactionId ? { transactionId: paymentRef } : {}),
        },
      })
    }

    if (!donation.waterProject.status) {
      await prisma.waterProject.update({
        where: { id: donation.waterProjectId },
        data: { status: "WAITING_TO_REVIEW" },
      })
    }

    if (!donation.emailSent) {
      try {
        await sendWaterProjectDonationEmail({
          donorEmail: donation.donor.email,
          donorName: `${donation.donor.firstName} ${donation.donor.lastName}`,
          projectType: donation.waterProject.projectType,
          location: donation.waterProject.location,
          country: donation.country.country,
          amount: donation.amountPence,
          donationType: donation.donationType,
        })
        await prisma.waterProjectDonation.update({
          where: { id: donation.id },
          data: { emailSent: true },
        })
      } catch (err) {
        console.error("Error sending water project donation email:", err)
      }
    }
  }

  for (const donation of sponsorshipDonations) {
    if ((donation.status ?? "PENDING") === "PENDING" || !donation.transactionId) {
      await prisma.sponsorshipDonation.update({
        where: { id: donation.id },
        data: {
          status: donation.status && donation.status !== "PENDING" ? donation.status : "WAITING_TO_REVIEW",
          ...(paymentRef && !donation.transactionId ? { transactionId: paymentRef } : {}),
        },
      })
    }

    if (!donation.sponsorshipProject.status) {
      await prisma.sponsorshipProject.update({
        where: { id: donation.sponsorshipProjectId },
        data: { status: "WAITING_TO_REVIEW" },
      })
    }

    if (!donation.emailSent) {
      try {
        await sendSponsorshipDonationEmail({
          donorEmail: donation.donor.email,
          donorName: `${donation.donor.firstName} ${donation.donor.lastName}`,
          projectType: donation.sponsorshipProject.projectType,
          location: donation.sponsorshipProject.location,
          country: donation.country.country,
          amount: donation.amountPence,
          donationType: donation.donationType,
        })
        await prisma.sponsorshipDonation.update({
          where: { id: donation.id },
          data: { emailSent: true },
        })
      } catch (err) {
        console.error("Error sending sponsorship donation email:", err)
      }
    }
  }

  // Send fundraiser notifications (best-effort)
  for (const donation of pendingDonations) {
    if (donation.fundraiserId && donation.fundraiser) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const fundraiserUrl = `${baseUrl}/fundraise/${donation.fundraiser.slug}`
      try {
        await sendFundraiserDonationNotification({
          fundraiserEmail: donation.fundraiser.email,
          fundraiserName: donation.fundraiser.fundraiserName,
          fundraiserTitle: donation.fundraiser.title,
          donorName: donation.donor.firstName || "Anonymous",
          amount: donation.amountPence,
          donationType: donation.donationType,
          fundraiserUrl,
        })
      } catch (err) {
        console.error("Error sending fundraiser donation notification:", err)
      }
    }
  }
}

