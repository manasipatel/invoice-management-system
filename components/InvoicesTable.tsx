"use client";

import { useState, useRef, useEffect } from "react";
import type { Invoice, InvoiceLineItem } from "@/lib/db/schema";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogButton,
  DialogCloseButton,
} from "@/components/ui/dialog";

interface InvoicesTableProps {
  invoices: Invoice[];
}

type SortKey =
  | "invoiceNumber"
  | "vendorName"
  | "customerName"
  | "invoiceDate"
  | "dueDate"
  | "amount"
  | "lineItemCount";

type SortDirection = "asc" | "desc";

export default function InvoicesTable({ invoices }: InvoicesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("invoiceDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  // State for line items dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogInvoice, setDialogInvoice] = useState<
    (Invoice & { lineItems?: InvoiceLineItem[] }) | null
  >(null);
  const [editedItems, setEditedItems] = useState<InvoiceLineItem[]>([]);

  const editTimeout = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const sortedInvoices = [...invoices].sort((a, b) => {
    let valA: any = a[sortKey as keyof Invoice];
    let valB: any = b[sortKey as keyof Invoice];

    if (sortKey === "lineItemCount") {
      valA = a.lineItems?.length || 0;
      valB = b.lineItems?.length || 0;
    }

    if (valA == null || valB == null) return 0;

    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();

    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const handleDeleteInvoice = (id: number) => {
    toast("Are you sure you want to delete this invoice?", {
      action: {
        label: "Delete",
        onClick: async () => {
          const toastId = toast.loading("Deleting invoice...");
          try {
            const res = await fetch(`/api/invoices/${id}`, {
              method: "DELETE",
            });
            if (!res.ok) throw new Error("Delete failed");

            toast.success("Invoice deleted", { id: toastId });
            window.location.reload(); // or update local state if preferred
          } catch (err) {
            toast.error("Failed to delete invoice", { id: toastId });
            console.error(err);
          }
        },
      },
      cancel: {
        label: "Cancel",
      },
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };
  // Sync edited items when dialog opens
  useEffect(() => {
    if (dialogInvoice) {
      setEditedItems(dialogInvoice.lineItems ?? []);
    }
  }, [dialogInvoice]);

  const renderSortArrow = (key: SortKey) =>
    sortKey === key ? (sortDirection === "asc" ? " ▲" : " ▼") : "";

  const updateInvoiceField = async (
    id: number,
    field: keyof Invoice,
    value: string
  ) => {
    const toastId = toast.loading("Updating...");
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value }),
      });

      if (!res.ok) throw new Error("Update failed");

      toast.success("Saved", { id: toastId });
    } catch (err) {
      toast.error("Failed to update", { id: toastId });
      console.error(err);
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLTableCellElement>,
    id: number,
    field: keyof Invoice,
    originalValue: string
  ) => {
    const newValue = e.currentTarget.textContent?.trim();

    if (!newValue || newValue === originalValue) return;

    const key = `${id}-${field}`;
    if (editTimeout.current[key]) clearTimeout(editTimeout.current[key]);

    editTimeout.current[key] = setTimeout(() => {
      updateInvoiceField(id, field, newValue);
    }, 500);
  };
  // Open dialog to edit line items
  const openLineItemsDialog = (
    inv: Invoice & { lineItems?: InvoiceLineItem[] }
  ) => {
    setDialogInvoice(inv);
    setIsDialogOpen(true);
  };
  const closeDialog = () => {
    setIsDialogOpen(false);
    setDialogInvoice(null);
  };

  // Whenever a new invoice opens, initialize editedItems
  useEffect(() => {
    if (dialogInvoice) {
      setEditedItems(dialogInvoice.lineItems ?? []);
    }
  }, [dialogInvoice]);

  // Track inline edits
  const handleLineItemFieldChange = (
    id: string,
    field: keyof InvoiceLineItem,
    value: string
  ) => {
    setEditedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // API helper – stitch line-item path onto your existing /api/invoices PATCH style
  const updateLineItemField = async (
    invoiceId: string,
    lineItemId: string,
    field: keyof InvoiceLineItem,
    value: string
  ) => {
    const toastId = toast.loading("Updating line item...");
    try {
      const res = await fetch(
        `/api/invoices/${invoiceId}/line-items/${lineItemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field, value }),
        }
      );
      if (!res.ok) throw new Error("Failed");
      toast.success("Line item saved", { id: toastId });
    } catch {
      toast.error("Could not save line item", { id: toastId });
    }
  };

  // When Save is clicked, push every changed field back to the server
  const handleSaveLineItems = async () => {
    if (!dialogInvoice) return;
    const invoiceId = dialogInvoice.id;
    for (const item of editedItems) {
      console.log("item", item);

      const orig = dialogInvoice.lineItems?.find((i) => i.id === item.id);
      if (!orig) continue;
      if (item.description !== orig.description) {
        await updateLineItemField(
          invoiceId,
          item.id,
          "description",
          item.description
        );
      }
      if (item.quantity !== orig.quantity) {
        await updateLineItemField(
          invoiceId,
          item.id,
          "quantity",
          item.quantity
        );
      }
      if (item.unitPrice !== orig.unitPrice) {
        await updateLineItemField(
          invoiceId,
          item.id,
          "unitPrice",
          item.unitPrice
        );
      }
      if (item.total !== orig.total) {
        await updateLineItemField(invoiceId, item.id, "total", item.total);
      }
    }
    closeDialog();
    window.location.reload(); // Refresh the page to see changes
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {(
              [
                ["#", "invoiceNumber"],
                ["Vendor", "vendorName"],
                ["Customer", "customerName"],
                ["Date", "invoiceDate"],
                ["Amount", "amount"],
                ["Due Date", "dueDate"],
                ["Line Items", "lineItemCount"],
                ["Token Usage", "tokenUsage"],
              ] as [string, SortKey][]
            ).map(([label, key]) => (
              <TableHead
                key={key}
                onClick={() => handleSort(key)}
                className={`cursor-pointer ${
                  key === "amount" ||
                  key === "dueDate" ||
                  key === "lineItemCount"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {label}
                {renderSortArrow(key)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedInvoices.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) =>
                  handleBlur(e, inv.id, "invoiceNumber", inv.invoiceNumber)
                }
              >
                {inv.invoiceNumber}
              </TableCell>
              <TableCell
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) =>
                  handleBlur(e, inv.id, "vendorName", inv.vendorName)
                }
              >
                {inv.vendorName}
              </TableCell>
              <TableCell
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) =>
                  handleBlur(e, inv.id, "customerName", inv.customerName)
                }
              >
                {inv.customerName}
              </TableCell>
              <TableCell
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) =>
                  handleBlur(
                    e,
                    inv.id,
                    "invoiceDate",
                    new Date(inv.invoiceDate).toISOString().slice(0, 10)
                  )
                }
              >
                {new Date(inv.invoiceDate).toISOString().slice(0, 10)}
              </TableCell>
              <TableCell
                className="text-right"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) =>
                  handleBlur(e, inv.id, "amount", String(inv.amount))
                }
              >
                {inv.amount}
              </TableCell>
              <TableCell
                className="text-right"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) =>
                  handleBlur(
                    e,
                    inv.id,
                    "dueDate",
                    inv.dueDate
                      ? new Date(inv.dueDate).toISOString().slice(0, 10)
                      : "N/A"
                  )
                }
              >
                {inv.dueDate
                  ? new Date(inv.dueDate).toISOString().slice(0, 10)
                  : "N/A"}
              </TableCell>
              <TableCell className="text-right">
                {inv.lineItems?.length || 0}
                <button
                  onClick={() => openLineItemsDialog(inv)}
                  className="ml-2 text-blue-500 hover:text-blue-600"
                  title="Edit Line Items"
                >
                  🖉
                </button>
              </TableCell>
              <TableCell className="text-center">
                {inv.tokenUsage?.totalTokens || 0}
              </TableCell>
              <TableCell className="text-center">
                <button
                  onClick={() => handleDeleteInvoice(inv.id)}
                  className="text-red-500 hover:text-red-700"
                  title="Delete Invoice"
                >
                  🗑️
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* Line Items Edit Dialog */}
      {isDialogOpen && dialogInvoice && (
        <Dialog>
          <DialogCloseButton onClick={closeDialog} />
          <DialogTitle>
            Line Items for Invoice {dialogInvoice.invoiceNumber}
          </DialogTitle>
          <DialogContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">Description</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) =>
                        handleLineItemFieldChange(
                          item.id,
                          "description",
                          e.currentTarget.textContent?.trim() || ""
                        )
                      }
                    >
                      {item.description}
                    </TableCell>
                    <TableCell
                      className="text-right"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) =>
                        handleLineItemFieldChange(
                          item.id,
                          "quantity",
                          e.currentTarget.textContent?.trim() || ""
                        )
                      }
                    >
                      {item.quantity}
                    </TableCell>
                    <TableCell
                      className="text-right"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) =>
                        handleLineItemFieldChange(
                          item.id,
                          "unitPrice",
                          e.currentTarget.textContent?.trim() || ""
                        )
                      }
                    >
                      {item.unitPrice}
                    </TableCell>
                    <TableCell
                      className="text-right"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) =>
                        handleLineItemFieldChange(
                          item.id,
                          "total",
                          e.currentTarget.textContent?.trim() || ""
                        )
                      }
                    >
                      {item.total}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
          <DialogActions>
            <DialogButton onClick={closeDialog}>Close</DialogButton>
            <DialogButton onClick={handleSaveLineItems}>Save</DialogButton>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}
