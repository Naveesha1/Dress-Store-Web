import React from "react";
import { Banner } from "../Components/Pages/Common";
import { MenuItemList } from "../Components/Pages/Home";


function Home() {
  return (
    <div>
      <Banner />
      <a
        href="https://dotnetmastery.com/Home/Details?courseId=29"
        target="_blank"
      >
        <div className="btn btn-danger form-control text-center text-white h4 custom-box">
          Welcome to Elegance Atelier!{" "}
          <span className="text-black">
            Clothes aren't going to change the world,
          </span>{" "}
          but the women who wear them will
        </div>
      </a>
      <div className="container p-2">
        <MenuItemList />
      </div>
    </div>
  );
}

export default Home;
