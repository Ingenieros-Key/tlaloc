"use client";

import { fetchAuthSession } from "aws-amplify/auth";
import { apiUrl } from "@/lib/amplify";

export type PlotRecord = {
  readonly plotId: string;
  readonly name: string;
  readonly geometry: unknown;
  readonly planting?: unknown;
  readonly priority?: string;
  readonly updatedAt: string;
};

export type PlotInput = {
  readonly name: string;
  readonly geometry: unknown;
  readonly planting?: unknown;
  readonly priority?: string;
};

function base(): string {
  return apiUrl.replace(/\/?$/, "/");
}

async function authHeaders(): Promise<HeadersInit> {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString() ?? "";
  return { Authorization: token, "Content-Type": "application/json" };
}

/** Saved land plots for the signed-in user. All calls require a Cognito session. */
export async function listPlots(): Promise<PlotRecord[]> {
  const res = await fetch(`${base()}plots`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(`GET plots ${res.status}`);
  return (await res.json()) as PlotRecord[];
}

export async function createPlot(input: PlotInput): Promise<PlotRecord> {
  const res = await fetch(`${base()}plots`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`POST plots ${res.status}`);
  return (await res.json()) as PlotRecord;
}

export async function updatePlot(id: string, input: PlotInput): Promise<PlotRecord> {
  const res = await fetch(`${base()}plots/${id}`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`PUT plots ${res.status}`);
  return (await res.json()) as PlotRecord;
}

export async function deletePlot(id: string): Promise<void> {
  const res = await fetch(`${base()}plots/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`DELETE plots ${res.status}`);
}
