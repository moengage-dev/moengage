// src/app/admin/products/products-client.tsx
"use client";

import React, { useState } from "react";
import { Plus, Pencil, Archive } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ProductForm } from "@/components/forms/product-form";
import {
  createProductAction,
  updateProductAction,
  archiveProductAction,
} from "@/app/admin/products/actions";
import type { ProductRow, BrandOption } from "@/server/services/products.service";
import type { ProductFormValues } from "@/lib/validators/product.validator";
import { formatDate, formatStatusLabel } from "@/lib/format";

type Props = {
  products: ProductRow[];
  brands: BrandOption[];
};

export function ProductsClient({ products, brands }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | undefined>(
    undefined
  );

  function openCreate() {
    setEditingProduct(undefined);
    setSheetOpen(true);
  }

  function openEdit(product: ProductRow) {
    setEditingProduct(product);
    setSheetOpen(true);
  }

  function handleSheetSuccess() {
    setSheetOpen(false);
  }

  async function handleArchive(product: ProductRow) {
    const result = await archiveProductAction(product.id);
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }
  }

  function makeSubmitAction(product?: ProductRow) {
    return (values: ProductFormValues) =>
      product
        ? updateProductAction(product.id, values)
        : createProductAction(values);
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit Label</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground py-8"
                >
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.brandName}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {product.slug}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {product.sku ?? "—"}
                  </TableCell>
                  <TableCell>{product.category ?? "—"}</TableCell>
                  <TableCell>{product.unitLabel ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        product.status === "ACTIVE"
                          ? "default"
                          : product.status === "ARCHIVED"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {formatStatusLabel(product.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(product.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(product)}
                        title="Edit product"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      {product.status !== "ARCHIVED" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Archive product"
                            >
                              <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="sr-only">Archive</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Archive product?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will set <strong>{product.name}</strong> to
                                Archived status. No data will be deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleArchive(product)}
                              >
                                Archive
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingProduct ? "Edit Product" : "Add Product"}
            </SheetTitle>
            <SheetDescription>
              {editingProduct
                ? "Update product details below."
                : "Fill in the details to create a new product."}
            </SheetDescription>
          </SheetHeader>
          <ProductForm
            key={editingProduct?.id ?? "create"}
            initialData={editingProduct}
            brands={brands}
            onSubmitAction={makeSubmitAction(editingProduct)}
            onSuccess={handleSheetSuccess}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
