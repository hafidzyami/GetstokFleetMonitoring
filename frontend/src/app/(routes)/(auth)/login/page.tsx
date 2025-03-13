import Image from "next/image";
import bgLogin from "@/app/_assets/bgLogin.png";
import getstokLogo from "@/app/_assets/getstokLogo.png";

export default function Login() {
  return (
    <div>
      <Image
        src={bgLogin}
        alt="background login"
        className="w-full h-[100vh]"
      />
      <div className="w-11/12 sm:w-3/4 md:w-2/3 lg:w-1/2 xl:w-1/3 absolute flex flex-col justify-center items-center top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 sm:p-6 md:p-8 lg:p-10 gap-5 sm:gap-6 md:gap-8 lg:gap-10 rounded-lg shadow-md">
        <Image
          src={getstokLogo}
          alt="getstok logo"
          width={150}
          height={100}
          className="w-32 sm:w-40 md:w-150"
        />
        <div className="flex flex-col justify-center items-center">
          <h1 className="text-[#009EFF] text-xl sm:text-2xl md:text-3xl font-semibold">
            Login
          </h1>
          <p className="text-[#989898] text-sm sm:text-base">
            Selamat datang kembali!
          </p>
        </div>
        <div className="flex flex-col w-full gap-3 md:gap-4">
          <div className="flex flex-col w-full">
            <p className="text-sm sm:text-base">Email</p>
            <input
              type="email"
              className="border-2 rounded-lg p-2 sm:p-3 focus:outline-none focus:border-[#009EFF]"
              placeholder="masukkan email"
            />
          </div>
          <div className="flex flex-col w-full">
            <p className="text-sm sm:text-base">Password</p>
            <input
              type="password"
              className="border-2 rounded-lg p-2 sm:p-3 focus:outline-none focus:border-[#009EFF]"
              placeholder="masukkan password"
            />
            <p className="text-[#FBB25B] w-full text-sm sm:text-base mt-1 cursor-pointer hover:underline">
              Lupa Password?
            </p>
          </div>
        </div>
        <button className="bg-[#009EFF] text-white rounded-lg p-2 sm:p-3 w-full hover:bg-[#0080D0] transition-colors">
          Login
        </button>
        <p className="text-sm text-gray-600 mt-2">
          Belum punya akun?{" "}
          <span className="text-[#009EFF] cursor-pointer hover:underline">
            Daftar
          </span>
        </p>
      </div>
    </div>
  );
}
