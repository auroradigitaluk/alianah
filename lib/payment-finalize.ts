import { prisma } from "@/lib/prisma"
import {
  sendDonationConfirmationEmail,
  sendFundraiserDonationNotification,
  sendSponsorshipDonationEmail,
  sendWaterProjectDonationEmail,
} from "@/lib/email"
import { createPortalToken } from "@/lib/portal-token"
import { COLLECTION_SOURCES, PAYMENT_METHODS } from "@/lib/utils"

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

  // Idempotency: only one process may finalize this order for this payment. "Claim" the order by
  // setting transactionId; if it's already set (by us or another process), skip.
  if (paymentRef) {
    const claimed = await prisma.demoOrder.updateMany({
      where: { orderNumber, transactionId: null },
      data: { transactionId: paymentRef },
    })
    if (claimed.count === 0) return
  }

  const wasAlreadyCompleted = order.status === "COMPLETED"
  const hasRecurringItems = order.items.some(
    (item) => item.frequency === "MONTHLY" || item.frequency === "YEARLY"
  )
  const targetFrequencies: Array<"ONE_OFF" | "MONTHLY" | "YEARLY"> = isSubscription
    ? ["MONTHLY", "YEARLY"]
    : ["ONE_OFF"]
  const shouldFinalizeOrder = !hasRecurringItems || isSubscription
  const paymentMethod = PAYMENT_METHODS.WEBSITE_STRIPE
  const collectedVia = COLLECTION_SOURCES.WEBSITE

  const donor =
    (await prisma.donor.findUnique({ where: { email: order.donorEmail } })) ??
    (await prisma.donor.create({
      data: {
        firstName: order.donorFirstName,
        lastName: order.donorLastName,
        email: order.donorEmail,
        phone: order.donorPhone || null,
        address: order.donorAddress || null,
        city: order.donorCity || null,
        postcode: order.donorPostcode || null,
        country: order.donorCountry || null,
      },
    }))

  const existingDonations = await prisma.donation.findMany({
    where: { orderNumber },
    include: {
      donor: true,
      fundraiser: {
        include: {
          appeal: { select: { title: true } },
        },
      },
    },
  })

  if (existingDonations.length > 0) {
    await prisma.donation.updateMany({
      where: {
        orderNumber,
        status: "PENDING",
        frequency: { in: targetFrequencies },
      },
      data: {
        status: "COMPLETED",
        completedAt: paidAt,
        ...(paymentRef ? { transactionId: paymentRef } : {}),
      },
    })
  }

  let createdAppealDonations: typeof existingDonations = []
  let createdWaterDonations: Array<{
    id: string
    waterProjectId: string
    fundraiserId?: string | null
    status?: string | null
    transactionId?: string | null
    emailSent?: boolean | null
    donor: { firstName: string; lastName: string; email: string }
    country: { country: string }
    waterProject: { projectType: string; location: string | null; status?: string | null }
    fundraiser?: { id: string; slug: string; fundraiserName: string; email: string; title: string } | null
    amountPence: number
    donationType: string
  }> = []
  let createdSponsorshipDonations: Array<{
    id: string
    sponsorshipProjectId: string
    status?: string | null
    transactionId?: string | null
    emailSent?: boolean | null
    donor: { firstName: string; lastName: string; email: string }
    country: { country: string }
    sponsorshipProject: { projectType: string; location: string | null; status?: string | null }
    amountPence: number
    donationType: string
  }> = []

  const billingAddress = order.donorAddress || null
  const billingCity = order.donorCity || null
  const billingPostcode = order.donorPostcode || null
  const billingCountry = order.donorCountry || null

  const donationKeyForItem = (item: {
    appealId?: string | null
    fundraiserId?: string | null
    productId?: string | null
    frequency: string
    amountPence: number
    donationType: string
  }) =>
    [
      item.appealId || "",
      item.fundraiserId || "",
      item.productId || "",
      item.frequency,
      item.amountPence.toString(),
      item.donationType,
    ].join("|")

  const existingDonationCounts = new Map<string, number>()
  existingDonations.forEach((donation) => {
    const key = donationKeyForItem(donation)
    existingDonationCounts.set(key, (existingDonationCounts.get(key) ?? 0) + 1)
  })

  const appealItems = order.items.filter(
    (item) => item.appealId && targetFrequencies.includes(item.frequency as "ONE_OFF" | "MONTHLY" | "YEARLY")
  )
  if (appealItems.length > 0) {
    const appealItemsToCreate = appealItems.filter((item) => {
      const key = donationKeyForItem(item)
      const count = existingDonationCounts.get(key) ?? 0
      if (count > 0) {
        existingDonationCounts.set(key, count - 1)
        return false
      }
      return true
    })

    if (appealItemsToCreate.length > 0) {
      createdAppealDonations = await Promise.all(
        appealItemsToCreate.map((item) =>
          prisma.donation.create({
            data: {
              donorId: donor.id,
              appealId: item.appealId!,
              fundraiserId: item.fundraiserId || null,
              productId: item.productId || null,
              amountPence: item.amountPence,
              donationType: item.donationType,
              frequency: item.frequency,
              paymentMethod,
              collectedVia,
              status: "COMPLETED",
              giftAid: order.giftAid,
              isAnonymous: item.isAnonymous ?? false,
              billingAddress,
              billingCity,
              billingPostcode,
              billingCountry,
              orderNumber,
              completedAt: paidAt,
              ...(paymentRef ? { transactionId: paymentRef } : {}),
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
        )
      )
    }
  }

  const existingWaterDonations = await prisma.waterProjectDonation.findMany({
    where: { notes: { contains: `OrderNumber:${orderNumber}` } },
    select: { id: true },
  })
  const waterItems = order.items.filter(
    (item) => item.waterProjectId && targetFrequencies.includes(item.frequency as "ONE_OFF" | "MONTHLY" | "YEARLY")
  )
  if (waterItems.length > 0 && existingWaterDonations.length === 0) {
    createdWaterDonations = await Promise.all(
      waterItems.map((item) =>
        prisma.waterProjectDonation.create({
          data: {
            waterProjectId: item.waterProjectId!,
            countryId: item.waterProjectCountryId!,
            donorId: donor.id,
            fundraiserId: item.fundraiserId || null,
            amountPence: item.amountPence,
            donationType: item.donationType,
            paymentMethod,
            collectedVia,
            transactionId: paymentRef,
            giftAid: order.giftAid,
            isAnonymous: item.isAnonymous ?? false,
            billingAddress,
            billingCity,
            billingPostcode,
            billingCountry,
            emailSent: false,
            reportSent: false,
            status: "WAITING_TO_REVIEW",
            notes: [
              item.plaqueName ? `Plaque Name: ${item.plaqueName}` : null,
              `OrderNumber:${orderNumber}`,
            ]
              .filter(Boolean)
              .join(" | ") || null,
          },
          include: {
            waterProject: true,
            country: true,
            donor: true,
            fundraiser: true,
          },
        })
      )
    )
  }

  const existingSponsorshipDonations = await prisma.sponsorshipDonation.findMany({
    where: { notes: { contains: `OrderNumber:${orderNumber}` } },
    select: { id: true },
  })
  const sponsorshipItems = order.items.filter(
    (item) =>
      item.sponsorshipProjectId && targetFrequencies.includes(item.frequency as "ONE_OFF" | "MONTHLY" | "YEARLY")
  )
  if (sponsorshipItems.length > 0 && existingSponsorshipDonations.length === 0) {
    createdSponsorshipDonations = await Promise.all(
      sponsorshipItems.map((item) =>
        prisma.sponsorshipDonation.create({
          data: {
            sponsorshipProjectId: item.sponsorshipProjectId!,
            countryId: item.sponsorshipCountryId!,
            donorId: donor.id,
            amountPence: item.amountPence,
            donationType: item.donationType,
            paymentMethod,
            collectedVia,
            transactionId: paymentRef,
            giftAid: order.giftAid,
            billingAddress,
            billingCity,
            billingPostcode,
            billingCountry,
            emailSent: false,
            reportSent: false,
            status: "WAITING_TO_REVIEW",
            notes: `OrderNumber:${orderNumber}`,
          },
          include: {
            sponsorshipProject: true,
            country: true,
            donor: true,
          },
        })
      )
    )
  }

  const existingQurbaniDonations = await prisma.qurbaniDonation.findMany({
    where: { notes: { contains: `OrderNumber:${orderNumber}` } },
    select: { id: true },
  })
  const qurbaniItems = order.items.filter(
    (item) =>
      item.qurbaniCountryId &&
      item.qurbaniSize &&
      targetFrequencies.includes(item.frequency as "ONE_OFF" | "MONTHLY" | "YEARLY")
  )
  if (qurbaniItems.length > 0 && existingQurbaniDonations.length === 0) {
    await Promise.all(
      qurbaniItems.map((item) =>
        prisma.qurbaniDonation.create({
          data: {
            qurbaniCountryId: item.qurbaniCountryId!,
            size: item.qurbaniSize!,
            donorId: donor.id,
            amountPence: item.amountPence,
            donationType: item.donationType,
            paymentMethod,
            collectedVia,
            transactionId: paymentRef,
            giftAid: order.giftAid,
            isAnonymous: item.isAnonymous ?? false,
            billingAddress,
            billingCity,
            billingPostcode,
            billingCountry,
            notes: `OrderNumber:${orderNumber}`,
            qurbaniNames: item.qurbaniNames ?? null,
          },
        })
      )
    )
  }

  if (!wasAlreadyCompleted && shouldFinalizeOrder) {
    await prisma.demoOrder.update({
      where: { orderNumber },
      data: { status: "COMPLETED" },
    })
  }

  if (isSubscription && paymentRef) {
    const existingRecurring = await prisma.recurringDonation.findFirst({
      where: { subscriptionId: paymentRef },
    })

    if (existingRecurring) {
      await prisma.recurringDonation.update({
        where: { id: existingRecurring.id },
        data: {
          status: "ACTIVE",
          lastPaymentDate: paidAt,
          ...(nextPaymentDate ? { nextPaymentDate } : {}),
        },
      })
    } else {
      const recurringItems = order.items.filter(
        (item) => item.frequency === "MONTHLY" || item.frequency === "YEARLY"
      )
      await Promise.all(
        recurringItems.map((item) =>
          prisma.recurringDonation.create({
            data: {
              donorId: donor.id,
              appealId: item.appealId || null,
              productId: item.productId || null,
              amountPence: item.amountPence,
              donationType: item.donationType,
              frequency: item.frequency,
              paymentMethod,
              status: "ACTIVE",
              subscriptionId: paymentRef,
              lastPaymentDate: paidAt,
              ...(nextPaymentDate ? { nextPaymentDate } : {}),
            },
          })
        )
      )
    }
  }

  // Send donor confirmation email once
  if (!wasAlreadyCompleted && shouldFinalizeOrder) {
    try {
      const vercelUrl = process.env.VERCEL_URL
      const baseUrl = (
        vercelUrl && !vercelUrl.startsWith("localhost")
          ? `https://${vercelUrl}`
          : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      ).replace(/\/$/, "")
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
        baseUrl,
        ...(manageSubscriptionUrl ? { manageSubscriptionUrl } : {}),
      })
    } catch (err) {
      console.error("Error sending donation confirmation email:", err)
    }
  }

  const waterDonationsToNotify =
    createdWaterDonations.length > 0
      ? createdWaterDonations
      : await prisma.waterProjectDonation.findMany({
          where: { notes: { contains: `OrderNumber:${orderNumber}` } },
          include: { donor: true, country: true, waterProject: true },
        })

  for (const donation of waterDonationsToNotify) {
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

  const sponsorshipDonationsToNotify =
    createdSponsorshipDonations.length > 0
      ? createdSponsorshipDonations
      : await prisma.sponsorshipDonation.findMany({
          where: { notes: { contains: `OrderNumber:${orderNumber}` } },
          include: { donor: true, country: true, sponsorshipProject: true },
        })

  for (const donation of sponsorshipDonationsToNotify) {
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

  const fundraiserDonations =
    createdAppealDonations.length > 0 ? createdAppealDonations : existingDonations

  // Send fundraiser notifications (best-effort)
  for (const donation of fundraiserDonations) {
    if (donation.fundraiserId && donation.fundraiser) {
      const { getFundraiserBaseUrl } = await import("@/lib/utils")
      const fundraiserUrl = `${getFundraiserBaseUrl()}/fundraise/${donation.fundraiser.slug}`
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

  for (const donation of createdWaterDonations) {
    if (donation.fundraiserId && donation.fundraiser) {
      const { getFundraiserBaseUrl } = await import("@/lib/utils")
      const fundraiserUrl = `${getFundraiserBaseUrl()}/fundraise/${donation.fundraiser.slug}`
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

