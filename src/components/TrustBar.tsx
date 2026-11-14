import React from 'react';
import { Truck, ShieldCheck, RefreshCw, CreditCard } from 'lucide-react';

export const TrustBar: React.FC = () => {
  const trustItems = [
    {
      icon: Truck,
      title: 'Free Pan-India Delivery',
      description: 'On orders over ₹999 with tracking',
    },
    {
      icon: ShieldCheck,
      title: '100% Verified Sellers',
      description: 'Direct studio-backed warranties',
    },
    {
      icon: RefreshCw,
      title: '7-Day Return Guarantee',
      description: 'Hassle-free pickups & instant refund',
    },
    {
      icon: CreditCard,
      title: 'Razorpay Test Mode',
      description: 'UPI, Cards, NetBanking, and COD',
    },
  ];

  return (
    <section className="border-y border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {trustItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-start gap-3.5 group">
                <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900/50 group-hover:scale-105 transition-transform shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
