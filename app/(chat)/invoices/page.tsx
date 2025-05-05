// app/(chat)/invoices/page.tsx
import { getAllInvoices, getAverageInvoiceCost } from "@/lib/db/queries";
import InvoicesTable from "@/components/InvoicesTable";

export const metadata = {
  title: "Invoices",
};

export default async function InvoicesPage() {
  const invoices = await getAllInvoices();
  /// get average cost per invoice
  const invoiceCost: {
    avgCost: number;
    avgTokens: number;
    totalInvoices: number;
  } = (await getAverageInvoiceCost()) as {
    avgCost: number;
    avgTokens: number;
    totalInvoices: number;
  };
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Invoices</h1>
      <p className="mb-4">
        Average cost per invoice:{" "}
        {invoiceCost?.avgCost > 0
          ? `$${(invoiceCost?.avgCost).toFixed(2)}`
          : "No invoices available"}
      </p>
      <InvoicesTable invoices={invoices} />
    </div>
  );
}
