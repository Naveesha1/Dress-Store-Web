import React from "react";
import {
  useDeleteMenuItemMutation,
  useGetMenuItemsQuery,
} from "../../Apis/menuItemApi";
import { toast } from "react-toastify";
import { MainLoader } from "../../Components/Pages/Common";
import { menuItemModel } from "../../Interfaces";
import { useNavigate } from "react-router";


function MenuItemList() {
  const [deleteMenuItem] = useDeleteMenuItemMutation();
  const { data, isLoading } = useGetMenuItemsQuery(null);
  const navigate = useNavigate();

  const handleMenuItemDelete = async (id: number) => {
    toast.promise(
      deleteMenuItem(id),
      {
        pending: "Processing your request...",
        success: "Menu Item Deleted Successfully 👌",
        error: "Error encoutnered 🤯",
      },
      {
        theme: "dark",
      }
    );
  };

  return (
    <>
      {isLoading && <MainLoader />}
      {!isLoading && (
        <div className="table p-5">
          <div className="d-flex align-items-center justify-content-between">
            <h1 className="text-success">MenuItem List</h1>

            <button
              className="btn btn-success"
              onClick={() => navigate("/menuitem/menuitemupsert")}
            >
              Add New Menu Item
            </button>
          </div>
          {/* <div className="bg-danger form-control text-center text-white h4">
            In demo, you will not be able to create/update or delete Menu Items!
          </div> */}

          <div className="p-4" >
            <div className="row border" style={{ backgroundColor: 'lightgray' }} >
              <div className="col-1" style={{ backgroundColor: 'lightgray' }}>Image</div>
              <div className="col-1" style={{ backgroundColor: 'lightgray' }}>ID</div>
              <div className="col-2" style={{ backgroundColor: 'lightgray' }}>Name</div>
              <div className="col-2" style={{ backgroundColor: 'lightgray' }}>Category</div>
              <div className="col-1" style={{ backgroundColor: 'lightgray' }}>Price</div>
              <div className="col-2" style={{ backgroundColor: 'lightgray' }}>Special Tag</div>
              <div className="col-1" style={{ backgroundColor: 'lightgray' }}>Action</div>
            </div>

            {data.result.map((menuItem: menuItemModel) => {
              return (
                <div className="row border" key={menuItem.id}>
                  <div className="col-1">
                    <img
                      src={menuItem.imageSrc}
                      alt={menuItem.name}
                      style={{ 
                        width: "100%", 
                        maxWidth: "120px",
                        height:"80px",
                        objectFit:"cover"
                       }}
                    />
                  </div>
                  <div className="col-1">{menuItem.id}</div>
                  <div className="col-2">{menuItem.name}</div>
                  <div className="col-2">{menuItem.category}</div>
                  <div className="col-1">${menuItem.price}</div>
                  <div className="col-2">{menuItem.specialTag}</div>
                  <div className="col-1">
                    <button className="btn btn-success">
                      <i
                        className="bi bi-pencil-fill"
                        onClick={() =>
                          navigate("/menuitem/menuitemupsert/" + menuItem.id)
                        }
                      ></i>
                    </button>
                    <button
                      className="btn btn-danger mx-2"
                      onClick={() => handleMenuItemDelete(menuItem.id)}
                    >
                      <i className="bi bi-trash-fill"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

export default MenuItemList;