import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveNotificationTemplate } from "@/app/actions/admin";
import { AdminHeader } from "@/components/layouts/admin-layout";
import { Card, CardHeader, CardTitle, Badge } from "@/components/ui/common";
import { Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { SUPPORTED_VARIABLES, MAX_SMS_LENGTH } from "@/lib/templates";
import { FileText, PlusCircle, ArrowLeft } from "lucide-react";

export default async function AdminTemplatesPage() {
  await requirePermission("settings:write");

  const templates = await prisma.notificationTemplate.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="pb-12">
      <AdminHeader
        title="SMS Notification Templates"
        actions={
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Settings
          </Link>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-4.5 w-4.5 text-[var(--color-accent)]" aria-hidden="true" />
              Create New Approved SMS Template
            </CardTitle>
          </CardHeader>

          <p className="mb-4 pl-3 border-l-2 border-[var(--color-border)] text-xs text-[var(--color-secondary)] leading-relaxed">
            <strong className="font-medium text-[var(--color-foreground)]">Supported placeholders:</strong>{" "}
            {SUPPORTED_VARIABLES.map((v) => `{{${v}}}`).join(", ")}. Every template{" "}
            <strong className="font-medium text-[var(--color-foreground)]">must include</strong>{" "}
            <code>{"{{portal_link}}"}</code> so recipients authenticate before viewing sensitive details (FR-012). Max length: {MAX_SMS_LENGTH} chars.
          </p>

          <form action={saveNotificationTemplate} className="space-y-4">
            <Input
              label="Template Name"
              name="name"
              required
              placeholder="New Request Alert — Staff"
            />
            <Textarea
              label="SMS Message Body"
              name="body"
              required
              placeholder="G&G Manpower: Hi {{first_name}}, new request {{request_title}} ({{org_name}}) is {{status}}. Open portal: {{portal_link}}"
            />
            <SubmitButton size="sm">
              Create Template
            </SubmitButton>
          </form>
        </Card>

        <div className="space-y-4">
          <h2 className="font-display text-lg font-medium text-[var(--color-foreground)] flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-[var(--color-accent)]" aria-hidden="true" />
            Existing Templates ({templates.length})
          </h2>

          {templates.map((t) => (
            <Card key={t.id}>
              <form action={saveNotificationTemplate} className="space-y-3">
                <input type="hidden" name="templateId" value={t.id} />
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div className="flex-1">
                    <Input
                      label="Template Name"
                      name="name"
                      required
                      defaultValue={t.name}
                    />
                  </div>
                  <Badge variant="status" status={t.isActive ? "ACTIVE" : "DISABLED"}>
                    Version {t.version}
                  </Badge>
                </div>

                <Textarea
                  label="Body (increments version on save)"
                  name="body"
                  required
                  defaultValue={t.body}
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-[var(--color-muted-foreground)] tabular-nums">
                    Length: {t.body.length} / {MAX_SMS_LENGTH} chars
                  </span>
                  <SubmitButton size="sm">
                    Save New Version (v{t.version + 1})
                  </SubmitButton>
                </div>
              </form>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
