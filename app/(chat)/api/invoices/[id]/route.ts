// app/api/invoices/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  deleteInvoiceById,
  updateInvoice,
  updateInvoiceLineItem,
} from "@/lib/db/queries";
import { Invoice } from "@/lib/db/schema";
import { parseDate_YYYYMMDD } from "@/lib/utils";

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = await context.params;
    const { field, value } = await req.json();

    if (!id || !field) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    if (field === "lineItems") {
      const lineItems = JSON.parse(value);
      const updatedLineItems = await updateInvoiceLineItem(id, lineItems);
      return NextResponse.json(updatedLineItems);
    }

    // if the value of any dates is not in YYYY-MM-DD format then it will throw an error
    if (field === "invoiceDate" || field === "dueDate") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        // throw new Error("Invalid date format. Expected YYYY-MM-DD.");
        return NextResponse.json(
          { error: "Invalid date format. Expected YYYY-MM-DD." },
          { status: 400 }
        );
      }
    }
    /// preapre data for updateInvoice
    const invoiceData: Partial<Invoice> = {
      /// if the value is date then parse it to YYYY-MM-DD format and parseDate_YYYYMMDD
      [field]:
        field === "invoiceDate" || field === "dueDate"
          ? parseDate_YYYYMMDD(value)
          : value,
    };

    const updated = await updateInvoice({ id, data: invoiceData });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Update failed", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

// ✅ DELETE method
export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing invoice ID" },
        { status: 400 }
      );
    }

    const result = await deleteInvoiceById({ id });

    return NextResponse.json({ message: "Invoice deleted", result });
  } catch (err) {
    console.error("Delete failed", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
