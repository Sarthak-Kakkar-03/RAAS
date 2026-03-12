export default function Home() {
  return (
    <div className="flex justify-center items-center">
      <div className="hover-3d">
        {/* content */}
        <figure className="max-w-100 rounded-2xl">
          <img src="/sk_icon.png" alt="3D card" />
        </figure>
        {/* 8 empty divs needed for the 3D effect */}
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  );
}
