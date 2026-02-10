import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"

const MAX_FILES_PER_UPLOAD = 50

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const { id: projectId } = await params
    const poolAvailableWhere = {
      sponsorshipProjectId: projectId,
      assignedDonationId: null,
      assignedRecurringRef: null,
    }
    const [total, available] = await Promise.all([
      prisma.sponsorshipReportPool.count({ where: { sponsorshipProjectId: projectId } }),
      prisma.sponsorshipReportPool.count({ where: poolAvailableWhere }),
    ])
    return NextResponse.json({ total, available })
  } catch (error) {
    console.error("Report pool GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const { id: projectId } = await params
    const project = await prisma.sponsorshipProject.findUnique({
      where: { id: projectId },
    })
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const formData = await request.formData()
    const fileList = formData.getAll("file") as File[]
    const files = Array.isArray(fileList) ? fileList : [fileList].filter(Boolean)
    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }
    if (files.length > MAX_FILES_PER_UPLOAD) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES_PER_UPLOAD} files per upload` },
        { status: 400 }
      )
    }

    const created: { id: string; pdfUrl: string }[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!(file instanceof File) || file.type !== "application/pdf") continue
      const blob = await put(
        `sponsorships/report-pool/${projectId}/${Date.now()}-${i}-${file.name}`,
        file,
        { access: "public", contentType: "application/pdf" }
      )
      const row = await prisma.sponsorshipReportPool.create({
        data: {
          sponsorshipProjectId: projectId,
          pdfUrl: blob.url,
        },
      })
      created.push({ id: row.id, pdfUrl: row.pdfUrl })
    }

    return NextResponse.json({
      uploaded: created.length,
      total: await prisma.sponsorshipReportPool.count({
        where: { sponsorshipProjectId: projectId },
      }),
      available: await prisma.sponsorshipReportPool.count({
        where: {
          sponsorshipProjectId: projectId,
          assignedDonationId: null,
          assignedRecurringRef: null,
        },
      }),
    })
  } catch (error) {
    console.error("Report pool POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
