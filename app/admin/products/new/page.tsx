import { AdminHeader } from "@/components/admin-header"
import { ProductForm } from "@/components/product-form"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function NewProductPage() {
  return (
    <>
      <AdminHeader title="New Product" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Create Product</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Add a new donation product</p>
                </div>
                <div>
                  <ProductForm />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
