import { NodeHttpRequest, NodeHttpResponse } from './marketBaselineApi';
import {
  BASELINE_SCENARIO_ASSUMPTIONS,
  compareBaselineAndScenarioIntelligence,
} from '../src/utils/locationIntelligenceEngine';

function sendJson(res: NodeHttpResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req: NodeHttpRequest): Promise<Record<string, unknown>> {
  const reqAny = req as any;
  if (reqAny.body) {
    if (typeof reqAny.body === 'object') return reqAny.body;
    if (typeof reqAny.body === 'string') {
      try {
        return JSON.parse(reqAny.body);
      } catch {
        return {};
      }
    }
  }

  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk: unknown) => {
      raw += String(chunk);
      if (raw.length > 5_000_000) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw) as Record<string, unknown>);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', () => reject(new Error('Request stream error')));
  });
}

export function createLocationIntelligenceMiddleware() {
  return async (
    req: NodeHttpRequest,
    res: NodeHttpResponse,
    next: () => void
  ): Promise<void> => {
    const rawUrl = req.url || '';
    const pathname = rawUrl.split('?')[0];

    if (pathname !== '/api/location-intelligence/evaluate') {
      next();
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed. Use POST.' });
      return;
    }

    try {
      const body = (await readJsonBody(req)) as any;

      const rawProfile = body.profile || {};
      const profile = {
        businessType: rawProfile.businessType || 'Café',
        budget: rawProfile.budget || '₹15L',
        targetCustomer:
          rawProfile.targetCustomer || 'Students + young professionals',
        expansionObjective:
          rawProfile.expansionObjective || 'High-visibility neighborhood entry',
      };

      const candidate = body.candidate || {
        latitude: body.coordinates?.lat ?? 17.4319,
        longitude: body.coordinates?.lng ?? 78.4071,
        state: body.state || 'Telangana',
        city: body.city || 'Hyderabad',
        local_area: body.localArea || 'Jubilee Hills',
        label: body.candidateName || 'Jubilee Hills',
      };

      const rawAssumptions = body.assumptions || body.scenario || {};
      const assumptions = {
        rentDeltaPct: Number.isFinite(Number(rawAssumptions.rentDeltaPct))
          ? Number(rawAssumptions.rentDeltaPct)
          : BASELINE_SCENARIO_ASSUMPTIONS.rentDeltaPct,
        activityDeltaPct: Number.isFinite(
          Number(rawAssumptions.activityDeltaPct)
        )
          ? Number(rawAssumptions.activityDeltaPct)
          : BASELINE_SCENARIO_ASSUMPTIONS.activityDeltaPct,
        competitionDeltaCount: Number.isFinite(
          Number(rawAssumptions.competitionDeltaCount)
        )
          ? Number(rawAssumptions.competitionDeltaCount)
          : BASELINE_SCENARIO_ASSUMPTIONS.competitionDeltaCount,
      };

      const result = compareBaselineAndScenarioIntelligence({
        profile,
        candidate,
        marketBaseline: body.marketBaseline ?? null,
        streetScanFusion: body.streetScanFusion ?? null,
        assumptions,
      });

      sendJson(res, 200, result);
    } catch (err: any) {
      sendJson(res, 400, {
        error: err?.message || 'Failed to evaluate location intelligence',
      });
    }
  };
}
