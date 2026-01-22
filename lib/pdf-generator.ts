import jsPDF from "jspdf"

interface PDFReportData {
  projectType: string
  country: string
  donorName: string
  amount: number
  completionDate: string
  googleDriveLink?: string
  images: string[]
}

// Alianah branding colors - can be customized later
const BRAND_COLORS = {
  primary: "#2563eb", // Blue
  secondary: "#00B749", // Brand Green
  text: "#1f2937", // Dark gray
  lightGray: "#f3f4f6",
}

export async function generateCompletionReportPDF(data: PDFReportData): Promise<string> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let yPosition = margin

  // Helper function to add new page if needed
  const checkPageBreak = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      doc.addPage()
      yPosition = margin
      return true
    }
    return false
  }

  // Header with Alianah branding
  doc.setFillColor(BRAND_COLORS.primary)
  doc.rect(0, 0, pageWidth, 30, "F")
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont("helvetica", "bold")
  doc.text("ALIANAH", margin, 20)
  
  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text("Humanity Welfare", margin, 26)

  yPosition = 40

  // Title
  doc.setTextColor(BRAND_COLORS.text)
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("Water Project Completion Report", margin, yPosition)
  yPosition += 10

  // Divider line
  doc.setDrawColor(BRAND_COLORS.primary)
  doc.setLineWidth(0.5)
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 8

  // Project Details Section
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("Project Details", margin, yPosition)
  yPosition += 8

  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  
  const details = [
    { label: "Project Type:", value: data.projectType },
    { label: "Country:", value: data.country },
    { label: "Donor:", value: data.donorName },
    { label: "Amount:", value: `£${(data.amount / 100).toFixed(2)}` },
    { label: "Completion Date:", value: data.completionDate },
  ]

  details.forEach((detail) => {
    doc.setFont("helvetica", "bold")
    doc.text(detail.label, margin, yPosition)
    doc.setFont("helvetica", "normal")
    const labelWidth = doc.getTextWidth(detail.label)
    doc.text(detail.value, margin + labelWidth + 3, yPosition)
    yPosition += 6
  })

  yPosition += 5

  // Status Section
  doc.setFillColor(BRAND_COLORS.secondary)
  doc.setDrawColor(BRAND_COLORS.secondary)
  doc.roundedRect(margin, yPosition - 5, contentWidth, 8, 2, 2, "FD")
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("Status: Complete", margin + 3, yPosition)
  yPosition += 12

  // Message
  doc.setTextColor(BRAND_COLORS.text)
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  
  const message = "This project has been successfully completed. The images below show the completed work."
  const splitMessage = doc.splitTextToSize(message, contentWidth)
  doc.text(splitMessage, margin, yPosition)
  yPosition += splitMessage.length * 6 + 5

  // Images Section
  if (data.images && data.images.length > 0) {
    checkPageBreak(60)
    
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("Completion Images", margin, yPosition)
    yPosition += 8

    // Add images in a 2x2 grid
    const imageSize = (contentWidth - 5) / 2 // 2 columns with 5mm gap
    let imageIndex = 0

    for (let row = 0; row < 2 && imageIndex < data.images.length; row++) {
      checkPageBreak(imageSize + 10)
      
      for (let col = 0; col < 2 && imageIndex < data.images.length; col++) {
        const xPos = margin + col * (imageSize + 5)
        const yPos = yPosition

        try {
          // Convert image to base64 for PDF
          const response = await fetch(data.images[imageIndex])
          const blob = await response.blob()
          const reader = new FileReader()
          
          await new Promise((resolve) => {
            reader.onloadend = () => {
              try {
                const base64data = reader.result as string
                // Determine image format
                const format = base64data.includes("data:image/png") ? "PNG" : "JPEG"
                doc.addImage(base64data, format, xPos, yPos, imageSize, imageSize)
                imageIndex++
                resolve(null)
              } catch (error) {
                // If image fails to add, add placeholder
                doc.setFillColor(BRAND_COLORS.lightGray)
                doc.rect(xPos, yPos, imageSize, imageSize, "F")
                doc.setTextColor(BRAND_COLORS.text)
                doc.setFontSize(8)
                doc.text("Image", xPos + imageSize / 2 - 5, yPos + imageSize / 2)
                imageIndex++
                resolve(null)
              }
            }
            reader.onerror = () => {
              // Placeholder for failed images
              doc.setFillColor(BRAND_COLORS.lightGray)
              doc.rect(xPos, yPos, imageSize, imageSize, "F")
              doc.setTextColor(BRAND_COLORS.text)
              doc.setFontSize(8)
              doc.text("Image", xPos + imageSize / 2 - 5, yPos + imageSize / 2)
              imageIndex++
              resolve(null)
            }
            reader.readAsDataURL(blob)
          })
        } catch (error) {
          // Placeholder for errors
          doc.setFillColor(BRAND_COLORS.lightGray)
          doc.rect(xPos, yPos, imageSize, imageSize, "F")
          doc.setTextColor(BRAND_COLORS.text)
          doc.setFontSize(8)
          doc.text("Image", xPos + imageSize / 2 - 5, yPos + imageSize / 2)
          imageIndex++
        }
      }
      
      yPosition += imageSize + 5
    }
  }

  yPosition += 10

  // Google Drive Link Section
  if (data.googleDriveLink) {
    checkPageBreak(15)
    
    doc.setFillColor(BRAND_COLORS.lightGray)
    doc.roundedRect(margin, yPosition - 5, contentWidth, 12, 2, 2, "F")
    
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(BRAND_COLORS.text)
    doc.text("View All Project Content:", margin + 3, yPosition)
    
    doc.setFont("helvetica", "normal")
    doc.setTextColor(BRAND_COLORS.primary)
    const linkText = doc.splitTextToSize(data.googleDriveLink, contentWidth - 6)
    doc.text(linkText, margin + 3, yPosition + 6)
    
    yPosition += 15
  }

  // Footer
  yPosition = pageHeight - 20
  doc.setDrawColor(BRAND_COLORS.lightGray)
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 5

  doc.setFontSize(10)
  doc.setFont("helvetica", "italic")
  doc.setTextColor(BRAND_COLORS.text)
  const footerText = "Thank you for your generous support in making this project possible."
  const splitFooter = doc.splitTextToSize(footerText, contentWidth)
  doc.text(splitFooter, margin, yPosition)
  yPosition += 8

  doc.setFont("helvetica", "normal")
  doc.text("May Allah (SWT) accept your donation and reward you abundantly.", margin, yPosition)
  yPosition += 6

  doc.setFontSize(9)
  doc.text("Alianah Humanity Welfare", margin, yPosition)

  // Generate PDF as blob URL
  const pdfBlob = doc.output("blob")
  const pdfUrl = URL.createObjectURL(pdfBlob)

  return pdfUrl
}
