import { AdminHeader } from "@/components/admin-header"
import { ProductForm } from "@/components/product-form"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

async function getProduct(id: string) {
  return await prisma.product.findUnique({
    where: { id },
  })
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await getProduct(id)

  if (!product) {
    notFound()
  }

  return (
    <>
      <AdminHeader title="Edit Product" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Edit Product</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Update product details</p>
                </div>
                <div>
                  <ProductForm 
                    product={{
                      ...product,
                      type: product.type as "FIXED" | "VARIABLE",
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
