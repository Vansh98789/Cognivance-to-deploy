import { useNavigate } from "react-router-dom";
import img from "../assets/imgg.jpg"

export default function Landing() {
  const navigation = useNavigate();

  function handleClick() {
    navigation("/dashboard");
  }

  return (
    <div
      className="relative h-screen bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: `url(${img})` }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      <div className="relative z-10 text-center max-w-3xl px-6">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-wide">
          Cognivance
        </h1>

        <p className="text-lg md:text-xl text-gray-200 mb-8 leading-relaxed">
          Turn every interview into permanent proof of skill - recorded on-chain and forged into a Skill Passport that proves your true ability
        </p>

        <button
          onClick={handleClick}
          className="px-8 py-3 text-lg font-semibold rounded-full 
                     bg-gradient-to-r from-indigo-500 to-purple-600 
                     text-white shadow-lg 
                     hover:scale-105 hover:shadow-2xl 
                     transition-all duration-300 ease-in-out"
        >
          Let’s Go
        </button>
      </div>
    </div>
  );
}