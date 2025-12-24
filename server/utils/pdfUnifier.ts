import PDFDocument from 'pdfkit';
import type { KnowledgeBase } from '@shared/schema';

/**
 * Unifies multiple knowledge base items into a single PDF
 * @param knowledgeItems Array of knowledge base items to merge
 * @returns Buffer containing the unified PDF
 */
export async function unifyKnowledgeBaseToPDF(knowledgeItems: KnowledgeBase[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });

      doc.on('error', (error) => {
        reject(error);
      });

      // Add title page
      doc.fontSize(20).text('Knowledge Base', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.addPage();

      // Process each knowledge item
      knowledgeItems.forEach((item, index) => {
        if (index > 0) {
          doc.addPage();
        }

        // Add item title
        doc.fontSize(16).font('Helvetica-Bold').text(item.title || `Document ${index + 1}`, {
          underline: true,
        });
        doc.moveDown(0.5);

        // Add category and tags if available
        if (item.category) {
          doc.fontSize(10).font('Helvetica-Oblique').text(`Category: ${item.category}`);
          doc.moveDown(0.3);
        }

        if (item.tags && item.tags.length > 0) {
          doc.fontSize(10).font('Helvetica-Oblique').text(`Tags: ${item.tags.join(', ')}`);
          doc.moveDown(0.3);
        }

        // Add description if available
        if (item.description) {
          doc.fontSize(10).font('Helvetica').text(item.description);
          doc.moveDown(0.5);
        }

        // Add content
        doc.fontSize(11).font('Helvetica').text(item.content || '', {
          align: 'left',
          lineGap: 2,
        });

        // Add separator
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();
      });

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Converts text content to PDF buffer
 * @param content Text content to convert
 * @param title Optional title for the PDF
 * @returns Buffer containing the PDF
 */
export async function textToPDF(content: string, title: string = 'Document'): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });

      doc.on('error', (error) => {
        reject(error);
      });

      // Add title
      doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
      doc.moveDown();

      // Add content
      doc.fontSize(11).font('Helvetica').text(content, {
        align: 'left',
        lineGap: 2,
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

