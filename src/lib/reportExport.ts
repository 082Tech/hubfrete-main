import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReportData {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  summary?: { label: string; value: string | number }[];
}

export function exportToPDF(data: ReportData): void {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text(data.title, 14, 22);
  
  // Subtitle
  if (data.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(data.subtitle, 14, 30);
  }
  
  // Date
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, data.subtitle ? 38 : 30);
  
  // Table
  autoTable(doc, {
    head: [data.headers],
    body: data.rows,
    startY: data.subtitle ? 44 : 36,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 130, 246], // primary blue
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
  });
  
  // Summary
  if (data.summary && data.summary.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.text('Resumo:', 14, finalY);
    
    data.summary.forEach((item, index) => {
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`${item.label}: ${item.value}`, 14, finalY + 8 + (index * 6));
    });
  }
  
  // Save
  const fileName = `${data.title.replace(/\s+/g, '_').toLowerCase()}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

export function exportToExcel(data: ReportData): void {
  // Create worksheet data
  const wsData = [
    [data.title],
    data.subtitle ? [data.subtitle] : [],
    [`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`],
    [],
    data.headers,
    ...data.rows,
  ].filter((row) => row.length > 0);
  
  // Add summary if exists
  if (data.summary && data.summary.length > 0) {
    wsData.push([]);
    wsData.push(['Resumo']);
    data.summary.forEach((item) => {
      wsData.push([item.label, String(item.value)]);
    });
  }
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  const colWidths = data.headers.map((h) => ({ wch: Math.max(h.length, 15) }));
  ws['!cols'] = colWidths;
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
  
  // Save
  const fileName = `${data.title.replace(/\s+/g, '_').toLowerCase()}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// Format currency for reports
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Format number with thousands separator
export function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}
