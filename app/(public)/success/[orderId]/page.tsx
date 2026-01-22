import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ShareButton } from "@/components/share-button"

async function getOrder(orderId: string) {
  try {
    const order = await prisma.demoOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    })
    return order
  } catch (error) {
    return null
  }
}

export default async function SuccessPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  const order = await getOrder(orderId)

  if (!order) {
    notFound()
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12 md:px-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 sm:mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary/10">
              <svg
                className="h-6 w-6 sm:h-8 sm:w-8 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <CardTitle className="text-xl sm:text-2xl">Thank You!</CardTitle>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Your donation has been received. Order #{order.orderNumber}
            </p>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Donation Summary</h3>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs sm:text-sm">
                    <div>
                      <p className="font-medium">{item.appealTitle}</p>
                      {item.productName && (
                        <p className="text-muted-foreground">{item.productName}</p>
                      )}
                    </div>
                    <p className="font-medium">{formatCurrency(item.amountPence)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t flex justify-between text-sm sm:text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(order.totalPence)}</span>
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">Donor Details</h3>
              <div className="text-xs sm:text-sm space-y-1 text-muted-foreground">
                <p>
                  {order.donorFirstName} {order.donorLastName}
                </p>
                <p>{order.donorEmail}</p>
                {order.donorPhone && <p>{order.donorPhone}</p>}
              </div>
            </div>

            {order.giftAid && (
              <div className="bg-muted p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm font-medium mb-1">Gift Aid Claimed</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Thank you for claiming Gift Aid. This will increase the value of your donation by 25%.
                </p>
              </div>
            )}

            <div className="text-xs sm:text-sm text-muted-foreground">
              <p>Order Date: {formatDate(order.createdAt)}</p>
              <p>Status: {order.status}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-4">
              <Button asChild className="flex-1">
                <Link href="/">Donate Again</Link>
              </Button>
              <ShareButton appealTitle={order.items[0]?.appealTitle || "Support Alianah Humanity Welfare"} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
