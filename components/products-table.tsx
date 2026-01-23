"use client"

import { useState } from "react"
import Link from "next/link"
import { AdminTable, StatusBadge } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { IconTag, IconCurrencyPound } from "@tabler/icons-react"
import { ExternalLink, Package, DollarSign, Tag, Target } from "lucide-react"
import { formatCurrency, formatEnum } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
      <Dialog
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">
              {selectedProduct?.name || "Product Details"}
            </DialogTitle>
            <DialogDescription>
              Product information and pricing details
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 pt-4 border-b">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <TabsContent value="overview" className="space-y-6 mt-0">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12" />
                        <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Pricing
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0 relative z-10">
                          <div className="text-2xl font-bold text-primary">
                            {selectedProduct.type === "FIXED" && selectedProduct.fixedAmountPence ? (
                              formatCurrency(selectedProduct.fixedAmountPence)
                            ) : selectedProduct.type === "VARIABLE" ? (
                              <span className="text-lg">
                                {formatCurrency(selectedProduct.minAmountPence || 0)} - {formatCurrency(selectedProduct.maxAmountPence || 0)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-blue-500/5 via-card to-card border-blue-500/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-12 -mt-12" />
                        <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Type
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0 relative z-10">
                          <Badge variant="outline" className="text-muted-foreground px-1.5">
                            <IconTag className="mr-1 size-3" />
                            {formatEnum(selectedProduct.type)}
                          </Badge>
                        </CardContent>
                      </Card>
                      <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-green-500/5 via-card to-card border-green-500/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl -mr-12 -mt-12" />
                        <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Status
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0 relative z-10">
                          <StatusBadge isActive={selectedProduct.isActive} />
                        </CardContent>
                      </Card>
                    </div>

                    <Separator className="my-6" />

                    {/* Product Information */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-2">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Product Information</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Product Name
                              </p>
                              <p className="text-base font-semibold text-foreground">{selectedProduct.name}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Tag className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Unit Label
                              </p>
                              <p className="text-base text-foreground">{selectedProduct.unitLabel}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Target className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Product Type
                              </p>
                              <Badge variant="outline" className="text-muted-foreground px-1.5">
                                <IconTag className="mr-1 size-3" />
                                {formatEnum(selectedProduct.type)}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Slug
                              </p>
                              <p className="text-base font-mono text-sm text-foreground break-all">{selectedProduct.slug}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="pt-2">
                      <a
                        href={`/admin/products/${selectedProduct.id}/edit`}
                        className="text-sm text-primary hover:underline"
                      >
                        Edit Product →
                      </a>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
