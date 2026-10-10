import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createStreetScanMiddleware } from '../../backend/streetScanApi';

const middleware = createStreetScanMiddleware();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const nodeReq: any = req;
  const nodeRes: any = res;

  if (req.body && typeof req.body === 'object' && !nodeReq._bodyAttached) {
    const bodyStr = JSON.stringify(req.body);
    nodeReq._bodyAttached = true;
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
