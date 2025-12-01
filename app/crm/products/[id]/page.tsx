'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  Package,
  ArrowLeft,
  DollarSign,
  Tag,
  Loader2,
  Edit,
  Calendar,
  Hash,
  FileText,
} from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  description?: string;
  sku?: string;
  price: number;
  currency: string;
  category?: string;
  isActive: boolean;
  customFields?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export default function ProductDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated') {
      loadProduct();
    }
  }, [status, router, productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/crm/products/${productId}`);
      if (!res.ok) {
        router.push('/crm/products');
        return;
      }
      const data = await res.json();
      setProduct(data);
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  if (!session || !product) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="pt-16 main-content px-4 py-6 max-w-4xl mx-auto">
        <Link
          href="/crm/products"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft size={20} />
          Volver a Productos
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                <Package size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{product.name}</h1>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    product.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {product.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                {product.sku && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                    <Hash size={14} />
                    SKU: {product.sku}
                  </p>
                )}
                {product.category && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                    <Tag size={14} />
                    {product.category}
                  </p>
                )}
              </div>
            </div>
            <Link
              href="/crm/products"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Edit size={18} />
              Editar
            </Link>
          </div>

          {product.description && (
            <p className="mt-4 text-gray-600 dark:text-gray-300">{product.description}</p>
          )}

          <div className="mt-6 pt-4 border-t dark:border-gray-700">
            <div className="flex items-center gap-2">
              <DollarSign size={24} className="text-emerald-500" />
              <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(product.price, product.currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Información</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Moneda</span>
                <span className="text-gray-800 dark:text-gray-200">{product.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Creado</span>
                <span className="text-gray-800 dark:text-gray-200">
                  {new Date(product.createdAt).toLocaleDateString('es-MX')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Actualizado</span>
                <span className="text-gray-800 dark:text-gray-200">
                  {new Date(product.updatedAt).toLocaleDateString('es-MX')}
                </span>
              </div>
            </div>
          </div>

          {product.customFields && Object.keys(product.customFields).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Campos Personalizados</h2>
              <div className="space-y-2">
                {Object.entries(product.customFields).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                    </span>
                    <span className="text-gray-800 dark:text-gray-200">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
