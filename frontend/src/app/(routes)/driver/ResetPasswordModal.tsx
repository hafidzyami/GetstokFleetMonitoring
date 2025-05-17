import { Dialog } from "@headlessui/react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react"; // pastikan sudah install lucide-react

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ResetPasswordModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      const response = await fetch("/api/v1/profile/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const res = await response.json();
        throw new Error(res.message || "Gagal reset password");
      }

      alert("✅ Password berhasil diperbarui!");
      onClose();
      setOldPassword("");
      setNewPassword("");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      {/* Blur background */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
      <div className="flex items-center justify-center min-h-screen px-4 relative z-10">
        <Dialog.Panel className="bg-white p-6 rounded-md shadow-md max-w-sm w-full">
          <Dialog.Title className="text-lg font-bold mb-4">Reset Password</Dialog.Title>

          <div className="space-y-4">
            {/* Password Lama */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700">Password Lama</label>
              <input
                type={showOld ? "text" : "password"}
                className="w-full border rounded px-3 py-2 pr-10"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-8 text-gray-500"
                onClick={() => setShowOld(!showOld)}
              >
                {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Baru */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700">Password Baru</label>
              <input
                type={showNew ? "text" : "password"}
                className="w-full border rounded px-3 py-2 pr-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-8 text-gray-500"
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={onClose}
                disabled={loading}
              >
                Batal
              </button>
              <button
                className="px-4 py-2 bg-[#009EFF] text-white rounded hover:bg-blue-600"
                onClick={handleReset}
                disabled={loading}
              >
                {loading ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ResetPasswordModal;
