/**
 * Human Tasks API
 *
 * GET: List human tasks (filterable by status, framework)
 * POST: Create a human task manually
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth, parseBodyWithSchema } from "@/lib/api";
import { handleApiError } from "@/lib/error-handler";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireAuth();

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const framework = searchParams.get("framework");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
    const skip = (page - 1) * limit;

    const where = {
      orgId,
      ...(status ? { status } : {}),
      ...(framework ? { frameworkName: framework } : {}),
    };

    const [tasks, total] = await Promise.all([
      db.humanTask.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.humanTask.count({ where }),
    ]);

    return NextResponse.json({
      tasks,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const CreateTaskSchema = z.object({
  controlCode: z.string().min(1),
  controlName: z.string().min(1),
  frameworkName: z.string().min(1),
  taskType: z.enum([
    "access_review",
    "vendor_assessment",
    "training",
    "policy_approval",
    "board_review",
    "dr_test",
  ]),
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  dueDate: z.string().datetime().optional(),
  assignedToId: z.string().optional(),
  agentRunId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await requireAuth();

    const body = await parseBodyWithSchema(request, CreateTaskSchema);

    const task = await db.humanTask.create({
      data: {
        orgId,
        controlCode: body.controlCode,
        controlName: body.controlName,
        frameworkName: body.frameworkName,
        taskType: body.taskType,
        title: body.title,
        description: body.description,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        assignedToId: body.assignedToId ?? null,
        agentRunId: body.agentRunId ?? null,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
