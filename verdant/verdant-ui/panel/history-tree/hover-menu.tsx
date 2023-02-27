import * as React from "react";
import { RawNodeDatum } from "react-d3-tree/lib/types/types/common";

type HoverMenuProps = {
  x: number,
  y: number,
  nodeDatum: RawNodeDatum,
}
const HoverMenu = (props: HoverMenuProps) => {
  return (
    <div style={{
      position: "absolute",
      width: "200px",
      backgroundColor: "#eee",
      borderRadius: "5px",
      boxSizing: "border-box",
      left: props.x,
      top: props.y,

    }} className="hover-menu-container" >
      {props.nodeDatum.name}
    </div >
  );
};

export default HoverMenu;