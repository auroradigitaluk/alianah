import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { displayChildCode, parsePoolPdfMeta } from "@/lib/sponsorship-report-pool"

const MAX_FILES_PER_UPLOAD = 50
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB per file
const VALID_PROJECT_ID = /^[a-zA-Z0-9_-]+$/
const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

const poolAvailableWhere = (projectId: string) => ({
  sponsorshipProjectId: projectId,
  assignedDonationId: null,
  assignedRecurringRef: null,
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const { id: projectId } = await params
    if (!projectId || !VALID_PROJECT_ID.test(projectId)) {
      return NextResponse.json({ error: "Invalid project" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const listMode = searchParams.get("list") === "true"

    const [total, available] = await Promise.all([
      prisma.sponsorshipReportPool.count({ where: { sponsorshipProjectId: projectId } }),
      prisma.sponsorshipReportPool.count({ where: poolAvailableWhere(projectId) }),
    ])

    if (!listMode) {
      return NextResponse.json({ total, available })
    }

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
    )
    const status = searchParams.get("status") ?? "all"
    const q = (searchParams.get("q") ?? "").trim()

    const searchOr = q
      ? [
          { childCode: { contains: q, mode: "insensitive" as const } },
          { fileName: { contains: q, mode: "insensitive" as const } },
        ]
      : null

    const assignedOr = [
      { assignedDonationId: { not: null } },
      { assignedRecurringRef: { not: null } },
    ]

    const prismaWhere =
      status === "assigned"
        ? {
            sponsorshipProjectId: projectId,
            ...(searchOr ? { AND: [{ OR: assignedOr }, { OR: searchOr }] } : { OR: assignedOr }),
          }
        : status === "available"
          ? {
              sponsorshipProjectId: projectId,
              assignedDonationId: null,
              assignedRecurringRef: null,
              ...(searchOr ? { OR: searchOr } : {}),
            }
          : {
              sponsorshipProjectId: projectId,
              ...(searchOr ? { OR: searchOr } : {}),
            }

    const filteredTotal = await prisma.sponsorshipReportPool.count({ where: prismaWhere })

    const items = await prisma.sponsorshipReportPool.findMany({
      where: prismaWhere,
      orderBy: [{ childCode: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        pdfUrl: true,
        fileName: true,
        childCode: true,
        createdAt: true,
        assignedDonationId: true,
        assignedRecurringRef: true,
      },
    })

    return NextResponse.json({
      total,
      available,
      filteredTotal,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(filteredTotal / pageSize)),
      items: items.map((item) => ({
        id: item.id,
        pdfUrl: item.pdfUrl,
        fileName: item.fileName,
        childCode: displayChildCode(item),
        createdAt: item.createdAt.toISOString(),
        isAvailable: !item.assignedDonationId && !item.assignedRecurringRef,
        assignedDonationId: item.assignedDonationId,
      })),
    })
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
    if (!projectId || !VALID_PROJECT_ID.test(projectId)) {
      return NextResponse.json({ error: "Invalid project" }, { status: 400 })
    }
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
    for (const file of files) {
      if (file instanceof File && file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 10MB limit` },
          { status: 400 }
        )
      }
    }

    const created: { id: string; childCode: string }[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!(file instanceof File) || file.type !== "application/pdf") continue
      const { fileName, childCode } = parsePoolPdfMeta(file.name)
      const blob = await put(
        `sponsorships/report-pool/${projectId}/${Date.now()}-${i}-${file.name}`,
        file,
        { access: "public", contentType: "application/pdf" }
      )
      const row = await prisma.sponsorshipReportPool.create({
        data: {
          sponsorshipProjectId: projectId,
          pdfUrl: blob.url,
          fileName,
          childCode,
        },
      })
      created.push({ id: row.id, childCode })
    }

    return NextResponse.json({
      uploaded: created.length,
      total: await prisma.sponsorshipReportPool.count({
        where: { sponsorshipProjectId: projectId },
      }),
      available: await prisma.sponsorshipReportPool.count({
        where: poolAvailableWhere(projectId),
      }),
    })
  } catch (error) {
    console.error("Report pool POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
