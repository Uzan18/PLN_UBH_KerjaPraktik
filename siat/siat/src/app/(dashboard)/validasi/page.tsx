'use client';
import { ApprovalQueueTable } from '@/components/ApprovalQueueTable';
import { useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';

export default function ValidasiData() {
  const [showModal, setShowModal] = useState(false);

  const mockSessions = [
    { id: '1', testYear: 2024, asset: { name: 'Trafo 1' }, testType: { name: 'Insulation Resistance' }, createdBy: { name: 'Budi (Input)' } },
    { id: '2', testYear: 2024, asset: { name: 'Arrester 2' }, testType: { name: 'Arrester Ground' }, createdBy: { name: 'Siti (Input)' } },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Antrian Validasi Data (QC)</h1>
        <p className="text-gray-600">Daftar test session berstatus SUBMITTED yang menunggu persetujuan Anda.</p>
      </div>

      <ApprovalQueueTable sessions={mockSessions} onReview={() => setShowModal(true)} />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden">
            <div className="bg-gray-100 px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Review Data: Trafo 1 (Insulation Resistance)</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-black text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="border p-3 rounded">
                  <div className="text-sm text-gray-500 mb-1">IR Value</div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">25 MΩ</span>
                    <StatusBadge judgement="POOR" />
                  </div>
                </div>
                <div className="border p-3 rounded">
                  <div className="text-sm text-gray-500 mb-1">Temperature</div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">42 °C</span>
                    <StatusBadge judgement="NA" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-2">Catatan Penolakan (Wajib jika Reject, min 10 char)</label>
                <textarea className="w-full border rounded p-3 h-24 focus:ring focus:border-blue-500" placeholder="Tulis alasan kenapa data ini ditolak..." />
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded font-medium">Batal</button>
              <button className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded font-medium">Reject Data</button>
              <button className="px-6 py-2 bg-green-600 text-white hover:bg-green-700 rounded font-medium shadow">Approve &amp; Validate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}