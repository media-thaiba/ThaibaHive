import { PaymentGatewayAdapter } from './gateway-adapter';
import { RazorpayAdapter } from './razorpay-adapter';
import { StripeAdapter } from './stripe-adapter';
import { UpiAdapter } from './upi-adapter';
import { PaymentMethod } from '../types';

export class GatewayAdapterFactory {
  private static instance: GatewayAdapterFactory;
  private adapters: Map<PaymentMethod, PaymentGatewayAdapter> = new Map();
  private gatewayHealth: Map<PaymentMethod, boolean> = new Map();

  private constructor() {
    this.registerAdapter(new RazorpayAdapter());
    this.registerAdapter(new StripeAdapter());
    this.registerAdapter(new UpiAdapter());

    this.gatewayHealth.set('razorpay', true);
    this.gatewayHealth.set('stripe', true);
    this.gatewayHealth.set('upi', true);
  }

  public static getInstance(): GatewayAdapterFactory {
    if (!GatewayAdapterFactory.instance) {
      GatewayAdapterFactory.instance = new GatewayAdapterFactory();
    }
    return GatewayAdapterFactory.instance;
  }

  public registerAdapter(adapter: PaymentGatewayAdapter): void {
    this.adapters.set(adapter.gatewayName, adapter);
    this.gatewayHealth.set(adapter.gatewayName, true);
  }

  public getAdapter(method: PaymentMethod): PaymentGatewayAdapter {
    const adapter = this.adapters.get(method);
    if (!adapter) {
      // Fallback for card/netbanking to Razorpay or Stripe based on default
      if (method === 'pos_card' || method === 'bank_transfer') {
        return this.adapters.get('razorpay') || new RazorpayAdapter();
      }
      throw new Error(`Unsupported payment method: ${method}`);
    }
    return adapter;
  }

  public setGatewayHealth(method: PaymentMethod, isHealthy: boolean): void {
    this.gatewayHealth.set(method, isHealthy);
  }

  public resolveBestGateway(
    currency: string = 'INR',
    preferredMethod?: PaymentMethod
  ): PaymentGatewayAdapter {
    if (preferredMethod && this.adapters.has(preferredMethod) && this.gatewayHealth.get(preferredMethod) !== false) {
      return this.adapters.get(preferredMethod)!;
    }

    if (currency.toUpperCase() === 'INR') {
      if (this.gatewayHealth.get('razorpay') !== false) {
        return this.adapters.get('razorpay')!;
      }
      if (this.gatewayHealth.get('upi') !== false) {
        return this.adapters.get('upi')!;
      }
    }

    if (this.gatewayHealth.get('stripe') !== false) {
      return this.adapters.get('stripe')!;
    }

    // Default fallback
    return this.adapters.get('razorpay') || new RazorpayAdapter();
  }
}
