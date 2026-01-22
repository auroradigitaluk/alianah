"use client"

import { useState } from "react"
import Link from "next/link"
import { AdminTable, StatusBadge } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { IconTag, IconCurrencyPound } from "@tabler/icons-react"
import { ExternalLink } from "lucide-react"
import { formatCurrency, formatEnum } from "@/lib/utils"
import { DetailModal } from "@/components/detail-modal"

interface Product {
  id: string
  name: string
  slug: string
  type: string
  unitLabel: string
  fixedAmountPence: number | null
  minAmountPence: number | null
  maxAmountPence: number | null
  isActive: boolean
}

export function ProductsTable({ products }: { products: Product[] }) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  return (
    <>
      <AdminTable
        data={products}
        onRowClick={(product) => setSelectedProduct(product)}
        columns={[
        {
          id: "name",
          header: "Header",
          cell: (product) => (
            <div className="font-medium">{product.name}</div>
          ),
        },
        {
          id: "productType",
          header: "Product Type",
          cell: (product) => (
            <Badge variant="outline" className="text-muted-foreground px-1.5">
              <IconTag className="mr-1 size-3" />
              {formatEnum(product.type)}
            </Badge>
          ),
        },
        {
          id: "pricing",
          header: "Pricing",
          cell: (product) => (
            <div>
              {product.type === "FIXED" && product.fixedAmountPence ? (
                <div className="font-medium">
                  {formatCurrency(product.fixedAmountPence)}
                </div>
              ) : product.type === "VARIABLE" ? (
                <div className="font-medium">
                  {formatCurrency(product.minAmountPence || 0)} - {formatCurrency(product.maxAmountPence || 0)}
                </div>
              ) : (
                <div className="text-muted-foreground">-</div>
              )}
            </div>
          ),
        },
        {
          id: "type",
          header: "Type",
          cell: (product) => (
            <Badge variant="outline" className="text-muted-foreground px-1.5">
              <IconCurrencyPound className="mr-1 size-3" />
              {product.unitLabel}
            </Badge>
          ),
        },
        {
          id: "status",
          header: "Status",
          cell: (product) => <StatusBadge isActive={product.isActive} />,
        },
        {
          id: "productLink",
          header: "View",
          cell: (product) => (
            <Link
              href={`/product/${product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          ),
        },
      ]}
      enableSelection={false}
      />
      <DetailModal
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
        title={selectedProduct?.name || "Product Details"}
      >
        {selectedProduct && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</h3>
              <p className="text-base font-semibold">{selectedProduct.name}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Product Type</h3>
              <Badge variant="outline" className="text-muted-foreground px-1.5">
                <IconTag className="mr-1 size-3" />
                {formatEnum(selectedProduct.type)}
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pricing</h3>
              {selectedProduct.type === "FIXED" && selectedProduct.fixedAmountPence ? (
                <p className="text-2xl font-semibold">{formatCurrency(selectedProduct.fixedAmountPence)}</p>
              ) : selectedProduct.type === "VARIABLE" ? (
                <p className="text-2xl font-semibold">
                  {formatCurrency(selectedProduct.minAmountPence || 0)} - {formatCurrency(selectedProduct.maxAmountPence || 0)}
                </p>
              ) : (
                <p className="text-base text-muted-foreground">-</p>
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</h3>
              <Badge variant="outline" className="text-muted-foreground px-1.5">
                <IconCurrencyPound className="mr-1 size-3" />
                {selectedProduct.unitLabel}
              </Badge>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</h3>
              <StatusBadge isActive={selectedProduct.isActive} />
            </div>
            <div className="pt-2">
              <a
                href={`/admin/products/${selectedProduct.id}/edit`}
                className="text-sm text-primary hover:underline"
              >
                Edit Product →
              </a>
            </div>
          </div>
        )}
      </DetailModal>
    </>
  )
}
