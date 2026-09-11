(() => {
  'use strict';

  function download(blobUrl, filename) {
    if (!blobUrl) return;
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'MCQ_Exam_Result.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function create(options) {
    const {
      resultPanel,
      sections,
      filename = 'MCQ_Exam_Result.pdf',
      footerTitle = 'MCQ Exam Result',
      onStatus = () => {}
    } = options;

    if (!window.html2canvas || !window.jspdf?.jsPDF) {
      throw new Error('PDF libraries are unavailable.');
    }

    onStatus('PDF ফলাফল তৈরি হচ্ছে...');
    if (window.MathJax?.typesetPromise) await window.MathJax.typesetPromise();

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const footerSpace = 11;
    const contentWidth = pageWidth - (margin * 2);
    const maxContentHeight = pageHeight - margin - footerSpace;
    let y = margin;

    const blocks = [
      resultPanel,
      ...sections.flatMap(section => [
        section.querySelector('.intro'),
        section.querySelector('.rules'),
        ...section.querySelectorAll('.question-card')
      ])
    ].filter(Boolean);

    for (const block of blocks) {
      const canvas = await window.html2canvas(block, {
        scale: Math.min(1.5, window.devicePixelRatio || 1),
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        windowWidth: Math.max(document.documentElement.clientWidth, 760)
      });

      let drawWidth = contentWidth;
      let drawHeight = canvas.height * drawWidth / canvas.width;
      if (drawHeight > maxContentHeight) {
        drawHeight = maxContentHeight;
        drawWidth = canvas.width * drawHeight / canvas.height;
      }
      if (y > margin && y + drawHeight > pageHeight - footerSpace) {
        pdf.addPage();
        y = margin;
      }
      const x = margin + ((contentWidth - drawWidth) / 2);
      pdf.addImage(canvas.toDataURL('image/jpeg', .84), 'JPEG', x, y, drawWidth, drawHeight, undefined, 'FAST');
      y += drawHeight + 4;
    }

    const pageTotal = pdf.getNumberOfPages();
    for (let pageNumber = 1; pageNumber <= pageTotal; pageNumber++) {
      pdf.setPage(pageNumber);
      pdf.setTextColor(100, 112, 133);
      pdf.setFontSize(8);
      pdf.text(`${footerTitle} | Page ${pageNumber} / ${pageTotal}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
    }

    const blobUrl = URL.createObjectURL(pdf.output('blob'));
    return {
      blobUrl,
      filename,
      download: () => download(blobUrl, filename)
    };
  }

  window.ReusableExamPdf = { create, download };
})();
