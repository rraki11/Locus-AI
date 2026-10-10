import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createMarketBaselineMiddleware } from '../../backend/marketBaselineApi';

const middleware = createMarketBaselineMiddleware(process.env as Record<string, string>);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Adapt VercelRequest and VercelResponse to NodeHttpRequest / NodeHttpResponse
  const nodeReq: any = req;
  const nodeRes: any = res;

  // If Vercel has already parsed body as an object, wrap in streaming/buffer if needed,
  // or allow readJsonBody to read req.body if stream was already consumed.
  if (req.body && typeof req.body === 'object' && !nodeReq._bodyAttached) {
    const bodyStr = JSON.stringify(req.body);
    nodeReq._bodyAttached = true;
    // Mock stream events so readJsonBody gets the JSON string
    const originalOn = nodeReq.on?.bind(nodeReq);
    nodeReq.on = function (event: string, listener: any) {
      if (event === 'data') {
        listener(Buffer.from(bodyStr));
      } else if (event === 'end') {
        listener();
      } else if (originalOn) {
        originalOn(event, listener);
      }
      return nodeReq;
    };
  }

  await middleware(nodeReq, nodeRes, () => {
    res.status(404).json({ error: 'Endpoint not found' });
  });
}
