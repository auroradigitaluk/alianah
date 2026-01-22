import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Plus } from "lucide-react"
import { ProductsTable } from "@/components/products-table"

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getProducts() {
  try {
    return await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    })
  } catch (error) {
    return []
  }
}

export default async function ProductsPage() {
  const products = await getProducts()

  return (
    <>
      <AdminHeader
        title="Products"
        actions={
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus className="mr-2 h-4 w-4" />
              New Product
            </Link>
          </Button>
        }
      />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-base sm:text-lg font-semibold">Products</h2>
                  <p className="text-xs sm:text-xs sm:text-sm text-muted-foreground">Manage donation products</p>
                </div>
                <div>
                  <ProductsTable products={products} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
