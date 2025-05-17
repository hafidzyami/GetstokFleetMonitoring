"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import "boxicons/css/boxicons.min.css";
import Image from "next/image";
import { useAuth } from "@/app/contexts/AuthContext";

// Validasi Zod
const schema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

type FormValues = z.infer<typeof schema>;

const Login = () => {
  const { login, loading, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    await login(data.email, data.password);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="flex bg-[url(/image/LoginImage.png)] bg-cover bg-center w-full h-screen justify-center items-center px-6">
      <div className="bg-white flex flex-col p-8 rounded-[8px] sm:w-[400px] w-full">
        <div className="flex flex-col items-center gap-[8px] mb-3">
          <Image
            src={"/image/logo.png"}
            alt="Logo GetStok"
            width={150}
            height={50}
          />
          <h1 className="text-2xl text-[#009EFF] font-semibold">Masuk</h1>
          <p>{process.env.NODE_ENV} Last Update: Tanggal 19 April 2025</p>
          <h2 className="text-[#707070] font-light">
            Selamat datang kembali
          </h2>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-normal flex items-center gap-2">
              <i className="bx bx-envelope text-gray-500 text-xl"></i>
              Email
            </label>
            <input
              {...register("email")}
              type="email"
              id="email"
              className="border rounded-md p-4 font-normal text-sm w-full"
              placeholder="Masukkan email"
            />
            {errors.email && (
              <span className="text-red-500 text-sm">{errors.email.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-normal flex items-center gap-2">
              <i className="bx bx-lock-alt text-gray-500 text-xl"></i>
              Password
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
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <i className={`bx ${showPassword ? "bx-hide" : "bx-show"} text-xl`} />
              </button>
            </div>
            {errors.password && (
              <span className="text-red-500 text-sm">{errors.password.message}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
