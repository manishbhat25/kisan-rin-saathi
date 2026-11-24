"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { FieldShell, Input, Select, Textarea } from "@/components/forms/fields";
import { useI18n } from "@/components/providers";
import { Alert, Button, Card, cx, formatDate } from "@/components/ui";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import { DOCUMENT_TYPES, label, type FinancingRoute } from "@/lib/domain/constants";
import { FORM_STEPS, documentRequirements, fieldsFor, type FieldDef } from "@/lib/domain/fields";
import { submitSchemaFor } from "@/lib/domain/schemas";
import type { ApplicationView } from "@/server/domain/queries";
import { formatValue } from "./views";

type FormValues = Record<string, string>;
type Doc = ApplicationView["documents"][number];

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "application/pdf,image/jpeg,image/png";

function toFormValues(fields: FieldDef[], details: Record<string, unknown>): FormValues {
  const out: FormValues = {};
  for (const field of fields) {
    const value = details[field.key];
    out[field.key] = value === null || value === undefined ? "" : typeof value === "boolean" ? String(value) : String(value);
  }
  return out;
}

function toPayload(fields: FieldDef[], values: FormValues): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const field of fields) {
    const raw = (values[field.key] ?? "").trim();
    if (raw === "") out[field.key] = null;
    else if (field.kind === "number" || field.kind === "integer") out[field.key] = Number(raw.replace(/,/g, ""));
    else if (field.kind === "boolean") out[field.key] = raw === "true";
    else out[field.key] = raw;
  }
  return out;
}

export function ApplicationForm({ view, detailHref }: { view: ApplicationView; detailHref: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const route = view.route as FinancingRoute;
  const fields = useMemo(() => fieldsFor(route), [route]);
  const steps = FORM_STEPS[route];
  const correcting = view.status === "CHANGES_REQUESTED";

  const fieldRequests = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of view.openItems) if (item.itemType === "FIELD" && item.fieldKey) map[item.fieldKey] = item.message;
    return map;
  }, [view.openItems]);
  const docRequests = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of view.openItems) if (item.itemType === "DOCUMENT" && item.documentType) map[item.documentType] = item.message;
    return map;
  }, [view.openItems]);

  const initialValues = useMemo(() => toFormValues(fields, view.details), [fields, view.details]);
  const { register, getValues, setError, clearErrors, watch, formState, reset } = useForm<FormValues>({
    defaultValues: initialValues,
  });
  const values = watch();
  const [step, setStep] = useState(0);
  const [version, setVersion] = useState(view.version);
  const [docs, setDocs] = useState<Doc[]>(view.documents);
  const [responses, setResponses] = useState<Record<string, string>>(
    Object.fromEntries(view.openItems.map((item) => [item.id, item.farmerResponse ?? ""])),
  );
  const [busy, setBusy] = useState<null | "save" | "submit" | string>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "warning"; text: string; items?: string[] } | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [extraType, setExtraType] = useState<string>("");
  const dirty = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    dirty.current = formState.isDirty;
  }, [formState.isDirty]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const payload = toPayload(fields, values);
  const visible = (field: FieldDef) => !field.showIf || field.showIf(payload);
  const requirements = documentRequirements(route, payload);
  const docTypes = new Set(docs.map((doc) => doc.docType));

  function applyFieldErrors(fieldErrors: Record<string, string[] | undefined>, onlyStep?: number) {
    let first: number | null = null;
    for (const [key, errors] of Object.entries(fieldErrors)) {
      const field = fields.find((item) => item.key === key);
      if (!field || !errors?.length) continue;
      if (onlyStep !== undefined && field.step !== onlyStep) continue;
      if (!visible(field)) continue;
      setError(key, { message: errors[0] });
      first = first === null ? field.step : Math.min(first, field.step);
    }
    return first;
  }

  function validateStep(target: number): boolean {
    clearErrors();
    const parsed = submitSchemaFor(route).safeParse(toPayload(fields, getValues()));
    if (parsed.success) return true;
    const first = applyFieldErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>, target);
    return first === null;
  }

  async function save(quiet = false, reason: "save" | "next" | "submit" = "save"): Promise<number | null> {
    setBusy(reason);
    if (!quiet) setMessage(null);
    try {
      const result = await apiFetch<{ version: number }>(`/api/applications/${view.id}`, {
        method: "PATCH",
        body: { expectedVersion: version, details: toPayload(fields, getValues()), responses: correcting ? responses : undefined },
      });
      setVersion(result.version);
      reset(getValues());
      dirty.current = false;
      if (!quiet) setMessage({ tone: "success", text: "Saved. You can come back and finish later." });
      return result.version;
    } catch (error) {
      const err = error instanceof ApiClientError ? error : null;
      if (err?.details?.fieldErrors) {
        const first = applyFieldErrors(err.details.fieldErrors);
        if (first !== null) setStep(first);
      }
      setMessage({ tone: "error", text: err?.message ?? "Could not save. Please try again." });
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function next() {
    if (step < 3 && !validateStep(step)) {
      setMessage({ tone: "error", text: "Please fix the highlighted fields before continuing." });
      return;
    }
    const saved = await save(true, "next");
    if (saved !== null) {
      setMessage(null);
      setStep((current) => Math.min(current + 1, steps.length - 1));
    }
  }

  async function upload(docType: string, file: File | undefined) {
    if (!file) return;
    setUploadErrors((prev) => ({ ...prev, [docType]: "" }));
    if (file.size > MAX_BYTES) {
      setUploadErrors((prev) => ({ ...prev, [docType]: "This file is larger than 5 MB." }));
      return;
    }
    if (!ACCEPT.split(",").includes(file.type)) {
      setUploadErrors((prev) => ({ ...prev, [docType]: "Upload a PDF, JPG or PNG file." }));
      return;
    }
    setBusy(`upload-${docType}`);
    try {
      const form = new FormData();
      form.set("docType", docType);
      form.set("file", file);
      const doc = await apiFetch<{ id: string; docType: string; originalName: string; uploadedAt: string }>(
        `/api/applications/${view.id}/documents`,
        { form },
      );
      setDocs((prev) => [
        ...prev.filter((item) => item.docType !== docType),
        { ...doc, mimeType: file.type, sizeBytes: file.size, revisionNo: view.currentRevisionNo + 1 },
      ]);
    } catch (error) {
      setUploadErrors((prev) => ({
        ...prev,
        [docType]: error instanceof ApiClientError ? error.message : "Upload failed. Please try again.",
      }));
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    setMessage(null);
    const savedVersion = await save(true, "submit");
    if (savedVersion === null) return;
    setBusy("submit");
    try {
      await apiFetch(`/api/applications/${view.id}/${correcting ? "resubmit" : "submit"}`, {
        body: { expectedVersion: savedVersion },
      });
      dirty.current = false;
      router.push(`${detailHref}?submitted=1`);
      router.refresh();
    } catch (error) {
      const err = error instanceof ApiClientError ? error : null;
      if (err?.details?.fieldErrors && Object.keys(err.details.fieldErrors).length > 0) {
        const first = applyFieldErrors(err.details.fieldErrors);
        if (first !== null) setStep(first);
      }
      const items = [
        ...(err?.details?.missingDocuments ?? []).map((type) => `Upload: ${label(type)}`),
        ...(err?.details?.unresolvedItems ?? []).map((item) => item.message),
      ];
      setMessage({ tone: "error", text: err?.message ?? "Could not submit. Please try again.", items });
      if (err?.details?.missingDocuments?.length) setStep(3);
    } finally {
      setBusy(null);
    }
  }

  function renderField(field: FieldDef) {
    if (!visible(field)) return null;
    const error = formState.errors[field.key]?.message;
    const id = `f-${field.key}`;
    const common = {
      id,
      invalid: Boolean(error),
      "aria-describedby": [field.help ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined,
    };
    const labelText = field.unit && !field.unit.startsWith("₹") ? `${field.label} (${field.unit})` : field.unit ? `${field.label} (${field.unit})` : field.label;
    let control: React.ReactNode;
    if (field.kind === "select" || field.kind === "state") {
      control = (
        <Select {...common} defaultValue={initialValues[field.key]} {...register(field.key)}>
          <option value="">Choose…</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );
    } else if (field.kind === "boolean") {
      return (
        <fieldset
          key={field.key}
          className={cx("min-w-0", fieldRequests[field.key] && "rounded-lg bg-amber-50 p-3 ring-2 ring-amber-400")}
          aria-describedby={common["aria-describedby"]}
          aria-invalid={Boolean(error) || undefined}
        >
          <legend className="text-sm font-semibold text-ink">{field.label}</legend>
          {fieldRequests[field.key] ? (
            <p className="mt-1 text-sm font-medium text-amber-900">
              <span className="font-bold">Officer request: </span>
              {fieldRequests[field.key]}
            </p>
          ) : null}
          {field.help ? (
            <p id={`${id}-hint`} className="mt-0.5 text-sm text-muted">
              {field.help}
            </p>
          ) : null}
          <div className="mt-1.5 flex gap-3">
            {[
              ["true", "Yes"],
              ["false", "No"],
            ].map(([value, text]) => (
              <label
                key={value}
                className="flex min-h-11 flex-1 cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50"
              >
                <input
                  type="radio"
                  value={value}
                  defaultChecked={initialValues[field.key] === value}
                  {...register(field.key)}
                  id={value === "true" ? id : undefined}
                  className="h-4 w-4 accent-brand-700"
                />
                {text}
              </label>
            ))}
          </div>
          {error ? (
            <p id={`${id}-error`} className="mt-1 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}
        </fieldset>
      );
    } else {
      control = (
        <Input
          {...common}
          type="text"
          inputMode={field.kind === "number" ? "decimal" : field.kind === "integer" ? "numeric" : undefined}
          autoComplete={field.key === "fullName" ? "name" : "off"}
          defaultValue={initialValues[field.key]}
          {...register(field.key)}
        />
      );
    }
    return (
      <FieldShell key={field.key} id={id} label={labelText} hint={field.help} error={error} highlight={fieldRequests[field.key]}>
        {control}
      </FieldShell>
    );
  }

  function docRow(docType: string, reason: string | null, required: boolean) {
    const doc = docs.find((item) => item.docType === docType);
    const request = docRequests[docType];
    const inputId = `upload-${docType}`;
    return (
      <li key={docType} className={cx("rounded-lg border p-4", request ? "border-amber-400 bg-amber-50 ring-2 ring-amber-300" : "border-line bg-white")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">
              {label(docType)}
              {required ? <span className="ml-2 text-xs font-semibold text-red-700">needed to submit</span> : null}
            </p>
            {reason ? <p className="text-sm text-muted">{reason}</p> : null}
            {request ? (
              <p className="mt-1 text-sm font-medium text-amber-900">
                <span className="font-bold">Officer request: </span>
                {request}
              </p>
            ) : null}
            {doc ? (
              <p className="mt-1 text-sm text-emerald-800" data-testid={`doc-${docType}`}>
                ✓ {doc.originalName} · {formatDate(doc.uploadedAt)}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted">Not uploaded</p>
            )}
          </div>
          <div>
            <label
              htmlFor={inputId}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-line bg-white px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50 focus-within:ring-2 focus-within:ring-brand-600"
            >
              {busy === `upload-${docType}` ? "Uploading…" : doc ? "Replace file" : "Upload file"}
              <input
                id={inputId}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                disabled={busy !== null}
                data-testid={inputId}
                onChange={(event) => {
                  void upload(docType, event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
        {uploadErrors[docType] ? <p className="mt-2 text-sm font-medium text-red-700" role="alert">{uploadErrors[docType]}</p> : null}
      </li>
    );
  }

  const requirementTypes = new Set(requirements.map((req) => req.type));
  const extraDocs = [...new Set([...docs.map((doc) => doc.docType), ...Object.keys(docRequests)])].filter(
    (type) => !requirementTypes.has(type as never),
  );
  const missingRequired = requirements.filter((req) => req.requiredToSubmit && !docTypes.has(req.type));

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <nav aria-label="Form steps" className="lg:sticky lg:top-24 lg:self-start">
        <ol className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
          {steps.map((name, index) => (
            <li key={name} className="shrink-0">
              <button
                type="button"
                onClick={() => (index < step ? setStep(index) : undefined)}
                disabled={index > step}
                aria-current={index === step ? "step" : undefined}
                className={cx(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium",
                  index === step ? "bg-brand-700 text-white" : index < step ? "bg-brand-50 text-brand-800 hover:bg-brand-100" : "text-muted",
                )}
              >
                <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold", index === step ? "bg-white text-brand-800" : "bg-white ring-1 ring-line")}>
                  {index < step ? "✓" : index + 1}
                </span>
                {name}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="min-w-0 space-y-4">
        {correcting ? (
          <Alert tone="warning" title={t.actionRequired}>
            <p>The officer asked for the changes below. Highlighted fields and documents need your attention.</p>
            <ul className="mt-2 list-inside list-disc">
              {view.openItems.map((item) => (
                <li key={item.id}>
                  <span className="font-semibold">
                    {item.itemType === "FIELD"
                      ? fields.find((field) => field.key === item.fieldKey)?.label
                      : item.itemType === "DOCUMENT"
                        ? label(item.documentType)
                        : "General"}
                    :
                  </span>{" "}
                  {item.message}
                </li>
              ))}
            </ul>
          </Alert>
        ) : null}

        {message ? (
          <Alert tone={message.tone} role={message.tone === "success" ? "status" : "alert"}>
            {message.text}
            {message.items?.length ? (
              <ul className="mt-1 list-inside list-disc">
                {message.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </Alert>
        ) : null}

        <Card>
          <h2 ref={headingRef} tabIndex={-1} className="mb-1 text-xl font-bold outline-none">
            Step {step + 1} of {steps.length}: {steps[step]}
          </h2>
          <p className="mb-5 text-sm text-muted">
            {step < 3
              ? correcting
                ? "Fields marked by the officer are highlighted. Your progress is saved when you continue."
                : "Your progress is saved when you continue."
              : step === 3
                ? "Upload clear photos or scans. PDF, JPG or PNG, up to 5 MB each. Use sample documents in this demo."
                : "Check everything before you send it. You can go back to any step."}
          </p>

          {step < 3 ? (
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void next();
              }}
              className="grid gap-5 sm:grid-cols-2"
            >
              {fields.filter((field) => field.step === step).map(renderField)}
              <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
            </form>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <ul className="space-y-3">
                {requirements.map((req) => docRow(req.type, req.reason, req.requiredToSubmit))}
                {extraDocs.map((type) => docRow(type, null, false))}
              </ul>
              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-line p-3">
                <div className="min-w-48 flex-1">
                  <label htmlFor="extra-doc" className="text-sm font-semibold">
                    Add another document
                  </label>
                  <Select id="extra-doc" value={extraType} onChange={(event) => setExtraType(event.target.value)} className="mt-1">
                    <option value="">Choose document type…</option>
                    {DOCUMENT_TYPES.filter((type) => !requirementTypes.has(type) && !extraDocs.includes(type)).map((type) => (
                      <option key={type} value={type}>
                        {label(type)}
                      </option>
                    ))}
                  </Select>
                </div>
                {extraType ? (
                  <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-line bg-white px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50">
                    Upload {label(extraType).toLowerCase()}
                    <input
                      type="file"
                      accept={ACCEPT}
                      className="sr-only"
                      onChange={(event) => {
                        void upload(extraType, event.target.files?.[0]);
                        event.target.value = "";
                        setExtraType("");
                      }}
                    />
                  </label>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-5">
              {[0, 1, 2].map((group) => (
                <div key={group}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{steps[group]}</h3>
                    <button type="button" className="text-sm font-semibold text-brand-700 underline" onClick={() => setStep(group)}>
                      Edit<span className="sr-only"> {steps[group]}</span>
                    </button>
                  </div>
                  <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {fields
                      .filter((field) => field.step === group && visible(field))
                      .map((field) => (
                        <div key={field.key} className={cx(fieldRequests[field.key] && "rounded bg-amber-50 px-2 ring-1 ring-amber-300")}>
                          <dt className="text-xs text-muted">{field.label}</dt>
                          <dd className="font-medium">{formatValue(route, field.key, payload[field.key])}</dd>
                        </div>
                      ))}
                  </dl>
                </div>
              ))}
              <div>
                <h3 className="font-semibold">Documents</h3>
                <ul className="mt-1 text-sm">
                  {docs.map((doc) => (
                    <li key={doc.id}>✓ {label(doc.docType)} — {doc.originalName}</li>
                  ))}
                </ul>
                {missingRequired.length > 0 ? (
                  <p className="mt-1 text-sm font-medium text-red-700">Still needed: {missingRequired.map((req) => label(req.type)).join(", ")}</p>
                ) : null}
                {requirements.some((req) => !req.requiredToSubmit && !docTypes.has(req.type)) ? (
                  <p className="mt-1 text-sm text-amber-900">
                    You can submit without{" "}
                    {requirements.filter((req) => !req.requiredToSubmit && !docTypes.has(req.type)).map((req) => label(req.type).toLowerCase()).join(", ")}, but the
                    officer may ask for it.
                  </p>
                ) : null}
              </div>
              {correcting && view.openItems.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="font-semibold">Reply to the officer</h3>
                  {view.openItems.map((item) => (
                    <FieldShell
                      key={item.id}
                      id={`resp-${item.id}`}
                      label={`${item.itemType === "FIELD" ? fields.find((f) => f.key === item.fieldKey)?.label : item.itemType === "DOCUMENT" ? label(item.documentType) : "General"}: ${item.message}`}
                      hint={
                        item.itemType === "GENERAL"
                          ? "Required. Tell the officer what you did or why no change is needed."
                          : "Optional for fields and documents you changed. Required if you did not change it — explain why."
                      }
                    >
                      <Textarea
                        id={`resp-${item.id}`}
                        value={responses[item.id] ?? ""}
                        maxLength={500}
                        onChange={(event) => setResponses((prev) => ({ ...prev, [item.id]: event.target.value }))}
                      />
                    </FieldShell>
                  ))}
                </div>
              ) : null}
              <Alert tone="info">
                By submitting, you confirm the details are correct to the best of your knowledge. {t.advisory}
              </Alert>
            </div>
          ) : null}
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {step > 0 ? (
              <Button variant="secondary" onClick={() => setStep(step - 1)} disabled={busy !== null}>
                Back
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => void save()} loading={busy === "save"} disabled={busy !== null}>
              {correcting ? t.saveChanges : t.saveDraft}
            </Button>
          </div>
          {step < steps.length - 1 ? (
            <Button onClick={() => void next()} disabled={busy !== null} loading={busy === "next"}>
              Save and continue
            </Button>
          ) : (
            <Button onClick={() => void submit()} loading={busy === "submit"} disabled={busy !== null} data-testid="submit-application">
              {correcting ? t.resubmit : t.submit}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
