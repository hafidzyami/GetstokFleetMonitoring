"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import "boxicons/css/boxicons.min.css";
import Image from "next/image";
import { useRouter } from "next/navigation";

const schema = z
  .object({
    password: z.string().min(6, "Password minimal 6 karakter"),
    confirmPassword: z
      .string()
      .min(6, "Konfirmasi password minimal 6 karakter"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

const GantiPasswordPage = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormValues) => {
    console.log("Password Baru:", data.password);
    router.push("/pengemudi/kuitansi");
  };

  return (
    <div className="flex bg-[url(/image/LoginImage.png)] bg-cover bg-center w-full h-screen justify-center items-center px-6">
      <div className="bg-white flex flex-col p-8 rounded-[8px] sm:w-[400px] w-full">
        <div className="flex flex-col items-center gap-[8px] mb-3">
          <Image
            src="/image/logo.png"
            alt="Logo GetStok"
            width={150}
            height={50}
          />
          <h1 className="text-2xl text-[#009EFF] font-semibold">
            Ganti Password Anda
          </h1>
          <h2 className="text-[#707070] font-light">
            Masukkan password baru anda
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Password Baru */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-sm font-normal flex items-center gap-2"
            >
              <i className="bx bx-lock-alt text-gray-500 text-xl"></i>
              Password Baru
            </label>
            <div className="relative">
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                id="password"
                className="border rounded-md p-4 font-normal text-sm w-full"
                placeholder="Masukkan password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <i
                  className={`bx ${
                    showPassword ? "bx-hide" : "bx-show"
                  } text-xl`}
                ></i>
              </button>
            </div>
            {errors.password && (
              <span className="text-red-500 text-sm">
                {errors.password.message}
              </span>
            )}
          </div>

          {/* Konfirmasi Password */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-normal flex items-center gap-2"
            >
              <i className="bx bx-lock-alt text-gray-500 text-xl"></i>
              Konfirmasi Password Baru
            </label>
            <div className="relative">
              <input
                {...register("confirmPassword")}
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                className="border rounded-md p-4 font-normal text-sm w-full"
                placeholder="Ulangi password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <i
                  className={`bx ${
                    showConfirmPassword ? "bx-hide" : "bx-show"
                  } text-xl`}
                ></i>
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="text-red-500 text-sm">
                {errors.confirmPassword.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Ganti Password
          </button>
        </form>

        <p className="font-light text-sm text-center mt-1">
          Kembali ke halaman{" "}
          <a href="/login" className="underline  text-[#009EFF] ">Masuk</a>
        </p>
      </div>
    </div>
  );
};

export default GantiPasswordPage;
