import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleStreetScanFusion } from '../../server/streetScanApi';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      error: 'Method not allowed. Use POST.',
      details: 'Street Scan Fusion accepts POST requests containing normalized frame observations.',
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (parseErr: any) {
        return res.status(400).json({
          error: 'Invalid JSON request body',
          details: parseErr?.message || 'Failed to parse JSON body string',
        });
      }
    }

    if (!body || typeof body !== 'object') {
      return res.status(400).json({
        error: 'Missing request body',
        details: 'Expected a JSON object with candidate, frames, and baseline data.',
      });
    }

    const result = handleStreetScanFusion(body);
    console.log(
      `[Vercel /api/street-scan/fuse 200] Mode: ${result.scan_mode}, Frames: ${result.video_summary.frames_extracted}, Observed: ${result.deduplicated_entities.length}`
    );
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[Vercel /api/street-scan/fuse Error]:', err?.message || err);
    const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 400;
    return res.status(statusCode).json({
      error: err?.message || 'Failed to fuse street scan observations',
      statusCode,
    });
  }
}
