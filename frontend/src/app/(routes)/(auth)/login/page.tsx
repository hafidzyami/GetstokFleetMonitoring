import Image from "next/image";
import bgLogin from "@/app/_assets/bgLogin.png";
import getstokLogo from "@/app/_assets/getstokLogo.png";

export default function Login() {
  return (
    <div>
      <Image src={bgLogin} alt="Vercel Logo" className="w-full h-[100vh]" />
      <div className="w-1/3 absolute flex flex-col justify-center items-center top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-10 gap-10 rounded-lg">
        <Image src={getstokLogo} alt="Vercel Logo" width={150} height={100} />
        <div className="flex flex-col justify-center items-center">
          <h1 className="text-[#009EFF] text-3xl font-semibold">Login</h1>
          <p className="text-[#989898]">Selamat datang kembali!</p>
        </div>
        <div className="flex flex-col w-full gap-4">
          <div className="flex flex-col w-full">
            <p>Email</p>
            <input
              type="email"
              className="border-2 rounded-lg p-2 focus:outline-none focus:border-[#009EFF] p-3"
              placeholder="masukkan email"
            />
          </div>
          <div className="flex flex-col w-full">
            <p>Password</p>
            <input
              type="password"
              className="border-2 rounded-lg p-2 focus:outline-none focus:border-[#009EFF] p-3"
              placeholder="masukkan password"
            />
            <p className="text-[#FBB25B] w-full">Lupa Password?</p>
          </div>
        </div>
        <button className="bg-[#009EFF] text-white rounded-lg p-2 w-full">Login</button>
      </div>
    </div>
  );
}
