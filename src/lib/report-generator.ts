// src/lib/report-generator.ts
import Papa from "papaparse";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { formatCurrency, formatDateTime } from "@/lib/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateCSV(data: any[], columns: string[]): string {
  if (!data || data.length === 0) {
    return Papa.unparse({ fields: columns, data: [] });
  }

  return Papa.unparse(data, {
    columns: columns,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generatePDF(title: string, columns: string[], data: any[]): Buffer {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);

  // Add generation date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${formatDateTime(new Date())}`, 14, 30);

  if (data.length === 0) {
    doc.text("No data available for this report.", 14, 40);
  } else {
    // Add table
    (doc as any).autoTable({
      startY: 36,
      head: [columns],
      // Ensure data is mapped to arrays in the order of columns
      body: data.map(item => columns.map(col => item[col])),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });
  }

  // Convert to Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
