/**
 * API Tester & Mock Sandbox for QA and Developer Testing
 */

import { ApiResponseResult, HttpMethod } from '../types';

export interface ExecuteRequestOptions {
  method: HttpMethod;
  url: string;
  headers?: { key: string; value: string }[] | Record<string, string> | string;
  body?: string;
  expectedStatus?: number;
  expectedBody?: string;
  simulatedLatencyMs?: number;
  mockFailureCode?: number; // e.g. 401, 429, 500
}

export class ApiTester {
  static parseHeaders(
    headersInput?: { key: string; value: string }[] | Record<string, string> | string
  ): Record<string, string> {
    if (!headersInput) return {};
    if (typeof headersInput === 'string') {
      try {
        const parsed = JSON.parse(headersInput);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed as Record<string, string>;
        }
      } catch {
        // Parse raw key: value line by line
        const result: Record<string, string> = {};
        headersInput.split('\n').forEach((line) => {
          const parts = line.split(':');
          if (parts.length >= 2) {
            result[parts[0].trim()] = parts.slice(1).join(':').trim();
          }
        });
        return result;
      }
    } else if (Array.isArray(headersInput)) {
      const result: Record<string, string> = {};
      headersInput.forEach((h) => {
        if (h.key && h.key.trim()) {
          result[h.key.trim()] = h.value;
        }
      });
      return result;
    } else if (typeof headersInput === 'object') {
      return headersInput;
    }
    return {};
  }

  static async executeRequest(
    methodOrOptions: HttpMethod | ExecuteRequestOptions,
    url?: string,
    headersInput?: { key: string; value: string }[] | Record<string, string> | string,
    bodyContent?: string,
    expectedStatus: number = 200,
    expectedBody?: string,
    latencyMs?: number
  ): Promise<ApiResponseResult> {
    let method: HttpMethod = 'GET';
    let targetUrl: string = '';
    let headers: Record<string, string> = {};
    let body: string | undefined;
    let statusExpected: number = 200;
    let bodyExpected: string | undefined;
    let simDelay: number = 80;
    let mockFailureCode: number | undefined;

    if (typeof methodOrOptions === 'object') {
      method = methodOrOptions.method;
      targetUrl = methodOrOptions.url;
      headers = this.parseHeaders(methodOrOptions.headers);
      body = methodOrOptions.body;
      statusExpected = methodOrOptions.expectedStatus ?? 200;
      bodyExpected = methodOrOptions.expectedBody;
      simDelay = methodOrOptions.simulatedLatencyMs ?? 80;
      mockFailureCode = methodOrOptions.mockFailureCode;
    } else {
      method = methodOrOptions;
      targetUrl = url || '';
      headers = this.parseHeaders(headersInput);
      body = bodyContent;
      statusExpected = expectedStatus;
      bodyExpected = expectedBody;
      simDelay = latencyMs ?? 80;
    }

    const start = performance.now();

    // Simulated / Mock Endpoint Engine
    if (targetUrl.startsWith('mock://') || targetUrl.startsWith('/mock/') || !targetUrl.startsWith('http')) {
      if (simDelay > 0) {
        await new Promise((res) => setTimeout(res, simDelay));
      }
      const durationMs = Math.round(performance.now() - start);

      // Handle simulated error codes if requested
      if (mockFailureCode && mockFailureCode >= 400) {
        const errorDescriptions: Record<number, { text: string; msg: string }> = {
          400: { text: 'Bad Request', msg: 'The synthetic request payload failed validation schema.' },
          401: { text: 'Unauthorized', msg: 'Authentication credentials missing or invalid token.' },
          403: { text: 'Forbidden', msg: 'RBAC Access Denied: User lacks required test permissions.' },
          404: { text: 'Not Found', msg: 'Target resource or identity could not be located.' },
          422: { text: 'Unprocessable Entity', msg: 'Semantic validation failed: Duplicate account constraint.' },
          429: { text: 'Too Many Requests', msg: 'Rate limit exceeded: Max 5 test attempts allowed per minute.' },
          500: { text: 'Internal Server Error', msg: 'Mock upstream service encountered an unhandled exception.' },
        };
        const errInfo = errorDescriptions[mockFailureCode] || { text: 'Error', msg: 'Simulated API failure.' };

        return {
          status: mockFailureCode,
          statusText: errInfo.text,
          headers: {
            'content-type': 'application/json',
            'x-mock-sandbox': 'InboxForge',
            'retry-after': mockFailureCode === 429 ? '60' : '0',
          },
          body: JSON.stringify(
            {
              error: errInfo.text,
              statusCode: mockFailureCode,
              message: errInfo.msg,
              endpoint: targetUrl,
              timestamp: Date.now(),
            },
            null,
            2
          ),
          durationMs,
          timestamp: Date.now(),
          matchesExpectation: statusExpected === mockFailureCode,
        };
      }

      // Dynamic mock routing responses based on URL
      let mockPayload: any = {
        success: true,
        message: 'Mock API call executed successfully in local sandbox',
        method,
        endpoint: targetUrl,
        timestamp: Date.now(),
      };

      let respStatus = 200;
      let respStatusText = 'OK';

      if (targetUrl.includes('checkout')) {
        respStatus = 201;
        respStatusText = 'Created';
        mockPayload = {
          orderId: `ord_${Math.floor(100000 + Math.random() * 900000)}`,
          status: 'confirmed',
          total: 99.98,
          currency: 'USD',
          createdAt: new Date().toISOString(),
          receiptUrl: `mock://receipts/rcpt_${Date.now()}`,
        };
      } else if (targetUrl.includes('invite')) {
        mockPayload = {
          inviteId: `inv_${Math.random().toString(36).substring(2, 8)}`,
          team: 'Acme Cloud Devs',
          role: 'member',
          status: 'accepted',
          membershipExpires: Date.now() + 86400000 * 30,
        };
      } else if (targetUrl.includes('2fa') || targetUrl.includes('verify')) {
        mockPayload = {
          authenticated: true,
          tokenType: 'Bearer',
          accessToken: `jwt_mock_${Math.random().toString(36).substring(2, 16)}`,
          expiresIn: 3600,
        };
      } else if (targetUrl.includes('ingest') || targetUrl.includes('batch')) {
        mockPayload = {
          processedCount: 500,
          droppedCount: 0,
          latencyAvgMs: 1.2,
          status: 'completed',
        };
      } else if (body) {
        try {
          const parsed = JSON.parse(body);
          mockPayload = { ...mockPayload, receivedData: parsed };
        } catch {
          mockPayload.rawBody = body;
        }
      }

      let matches = respStatus === statusExpected;
      const bodyString = JSON.stringify(mockPayload, null, 2);
      if (matches && bodyExpected && bodyExpected.trim()) {
        matches = bodyString.includes(bodyExpected.trim());
      }

      return {
        status: respStatus,
        statusText: respStatusText,
        headers: {
          'content-type': 'application/json',
          'x-mock-sandbox': 'InboxForge',
          'x-response-time-ms': durationMs.toString(),
        },
        body: bodyString,
        durationMs,
        timestamp: Date.now(),
        matchesExpectation: matches,
      };
    }

    // Real Live Network Request (With safe CORS error reporting)
    try {
      const options: RequestInit = {
        method,
        headers,
      };

      if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
        options.body = body;
      }

      const res = await fetch(targetUrl, options);
      const durationMs = Math.round(performance.now() - start);
      const text = await res.text();

      const headersOut: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        headersOut[key] = val;
      });

      let matches = res.status === statusExpected;
      if (matches && bodyExpected && bodyExpected.trim()) {
        matches = text.includes(bodyExpected.trim());
      }

      return {
        status: res.status,
        statusText: res.statusText,
        headers: headersOut,
        body: text,
        durationMs,
        timestamp: Date.now(),
        matchesExpectation: matches,
      };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      return {
        status: 0,
        statusText: 'Network / CORS Error',
        headers: {},
        body: `Live Request Failed: ${err.message || 'Connection refused / CORS policy blocked request.'}\n\nTip: For local sandbox QA, you can test with simulated mock endpoints (e.g. mock://api/endpoint) or enable CORS headers on your target server.`,
        durationMs,
        timestamp: Date.now(),
        matchesExpectation: false,
        error: err.message,
      };
    }
  }
}
