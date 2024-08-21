// Selectors

let addButton = document.querySelector(".btn-add-todo");
let input = document.querySelector(".inner input");
let locationed = document.querySelector(".box-side .row");
let checkButton = document.querySelector(".btn-check-input");
let smallBtnSendUser = document.querySelector('.btn-send-user')

let btnRemoveAllTodo = document.querySelector('.remove-all button')

// variables
let listTodo = [];
let userValue = "";
let elemTarget;
let flagDataSet;
let modalOpenner;
let typeNotification = "";

// Load event listener

btnRemoveAllTodo.addEventListener('click',removeAllTodo)


const staticBackdrop = document.getElementById("staticBackdrop");
smallBtnSendUser.addEventListener('click',(e)=>{
  smallBtnSendUser.classList.add('active')
  setTimeout(()=>  smallBtnSendUser.classList.remove('active'),500)
})

staticBackdrop.addEventListener("shown.bs.modal", () => {
  inputValue.value = "";
  inputValue.focus();
});

window.addEventListener("load", () => {
  if (localStorage.getItem("listTodo") !== null) {
    getItemLocalStorage();
  }
  if (listTodo.length == 0) {
    btnRemoveAllTodo.style.display = 'none'
  } else {
    btnRemoveAllTodo.style.display = 'block'
  }

});

// Add event listener to add button

addButton.addEventListener("click", setNewData);
// Function to add new data to the list

function setNewData() {
  let text = input.value.trim();
  let hasDuplicate  = listTodo.some((item) => {
    return item.text.main == input.value.trim();
  });

  if (hasDuplicate ) {
    typeNotification = "fail";
    showNotice(typeNotification);
  } else {
    if (text) {
      let newData = {
        text: {
          main: text,
          first: `<button class="btn-add btn-big-title" data-set-name="first" data-bs-toggle="modal" data-bs-target="#staticBackdrop">
                              اضافه کردن <i class="bi bi-plus icon-add" ></i>
                            </button>`,
          firstSmaller1: `<button class="btn-add btn-big-title" data-set-name="firstSmaller1" data-bs-toggle="modal" data-bs-target="#staticBackdrop">
                              اضافه کردن <i class="bi bi-plus icon-add"></i>
                            </button>`,
          firstSmaller2: `<button class="btn-add btn-big-title" data-set-name="firstSmaller2" data-bs-toggle="modal" data-bs-target="#staticBackdrop">
                              اضافه کردن <i class="bi bi-plus icon-add"></i>
                            </button>`,
          second: `<button class="btn-add btn-big-title" data-set-name="second" data-bs-toggle="modal" data-bs-target="#staticBackdrop">
                              اضافه کردن <i class="bi bi-plus icon-add"></i>
                            </button>`,
          secondSmaller1: `<button class="btn-add btn-big-title" data-set-name="secondSmaller1" data-bs-toggle="modal" data-bs-target="#staticBackdrop">
                              اضافه کردن <i class="bi bi-plus icon-add"></i>
                            </button>`,
          secondSmaller2: `<button class="btn-add btn-big-title" data-set-name="secondSmaller2" data-bs-toggle="modal" data-bs-target="#staticBackdrop">
                              اضافه کردن <i class="bi bi-plus icon-add"></i>
                            </button>`,
        },
      };

      listTodo.push(newData);
      input.value = "";
      saveToLocalStorage(listTodo);
      typeNotification = "create";
      showNotice(typeNotification);
    }
  }
}
// Add event listener to input for enter key press
input.addEventListener("keyup", (e) => {
  if (e.keyCode == 13 && input.value.trim()) {
    setNewData();
  }
});
// Save todo list to local storage
function saveToLocalStorage(list) {
  localStorage.setItem("listTodo", JSON.stringify(list));
  getItemLocalStorage();
}
// get todo list from local storage
function getItemLocalStorage() {
  let list = JSON.parse(localStorage.getItem("listTodo"));
  if (list) {
    listTodo = list;
    renderList();
  }
  console.log(listTodo);
  
  if (listTodo.length == 0) {
    btnRemoveAllTodo.style.display = 'none'
  } else {
    btnRemoveAllTodo.style.display = 'block'
  }
}

// Function to render the list
function renderList() {
  locationed.innerHTML = "";
  let span = document.createElement("span");
  span.classList.add("little-todo");
  if (listTodo) {
    listTodo.forEach((item) => {
      locationed.insertAdjacentHTML(
        "beforeend",
        ` <div class="mx-auto col-xxl-2 col-lg-3 col-md-4 col-sm-6">
              <div class="flip-card">
                <div class="flip-card-inner">
                  <div class="flip-card-front">
                    <p class="title">${item.text.main}</p>
                    <div class="btn-group btn-arrow" role="group" aria-label="Basic mixed styles example">
                      <button type="button" class="btn btn-outline-danger remove-todo"><i class="bi bi-trash3 d-flex"></i></button>
                       <button type="button" class="btn btn-outline-secondary  rotate-todo"><i class="bi bi-arrow-repeat d-flex"></i></button>
                    </div>
                   
                  </div>
                  <div class="flip-card-back d-flex flex-column pb-2">
                    <div class="first-todo">
                      <ul class="list d-flex flex-column gy-2">
                        <li class="item my-2 w-100">
                          <span class="little-todo" data-set-name="first">${item.text.first}</span>
                          <ul class="ps-3">
                            <li class="w-100">
                              <span class="little-todo" data-set-name="firstSmaller1">${item.text.firstSmaller1}</span>
                            </li>
                            <li class="w-100">
                              <span class="little-todo" data-set-name="firstSmaller2">${item.text.firstSmaller2}</span>
                            </li>
                          </ul>
                        </li>
                        <li class="item my-2 w-100">
                          <span class="little-todo" data-set-name="second">${item.text.second}</span>
                          <ul class="ps-3">
                            <li class="w-100">
                              <span class="little-todo" data-set-name="secondSmaller1">${item.text.secondSmaller1}</span>
                            </li>
                            <li class="w-100">
                              <span class="little-todo" data-set-name="secondSmaller2">${item.text.secondSmaller2}</span>
                            </li>
                          </ul>
                        </li>
                      </ul>
                    </div>
                    <button class="btn-arrow rotate-todo ">
                      <i class="bi bi-arrow-repeat d-flex fs-3"></i>
                    </button>
                     
                  </div>
                </div>
              </div>
            </div>`
      );
    });

    let spanElements = document.querySelectorAll(".little-todo");
    spanElements.forEach((span) => {
      span.addEventListener("click", (e) => {
        if (e.target.tagName === "BUTTON" || e.target.tagName == "I") {
          return;
        } else if (e.target.tagName == "SPAN") {
          if (!e.target.querySelector("button")) {
            if (confirm("آیا مطمئن هستید که وظیفه حذف شود؟")) {
              const dataname = e.target.dataset.setName;

              let targetTitle = e.target
                .closest(".flip-card-inner")
                .querySelector(".title").innerHTML;
              console.log(targetTitle);

              let dataItem = listTodo.find((item) => {
                for (key in item.text) {
                  if (key == dataname) {
                    return item.text.main == targetTitle;
                  }
                }
              });
              dataItem.text[
                dataname
              ] = `<button class="btn-add btn-big-title" data-set-name="${dataname}" data-bs-toggle="modal" data-bs-target="#staticBackdrop"> اضافه کردن <i class="bi bi-plus icon-add" ></i></button>`;
              span.innerHTML = dataItem.text[dataname];
              localStorage.setItem("listTodo", JSON.stringify(listTodo));

              typeNotification = "delete";
              showNotice(typeNotification);
            }
          }
        }
      });
    });

    let btnsArrow = document.querySelectorAll(".rotate-todo");
    btnsArrow.forEach((btn) =>
      btn.addEventListener("click", (e) => {
        const parent = e.target.closest(".flip-card");
        if (parent.classList.contains("flip-card")) {
          parent.classList.toggle("rotate");
        }
      })
    );

    let btnsRemove = document.querySelectorAll(".remove-todo");
    btnsRemove.forEach((btn) =>
      btn.addEventListener("click", (e) => {
        let targetTitle = e.target
          .closest(".flip-card-inner")
          .querySelector(".title").innerHTML;

        let dataItem = listTodo.findIndex((item) => {
          return item.text.main == targetTitle;
        });
        if (dataItem !== -1) {
          if (confirm("آیا مطمئن هستی که وظیفه مورد نظر حذف گردد؟")) {
            listTodo.splice(dataItem, 1);
            saveToLocalStorage(listTodo);

            typeNotification = "delete";
            showNotice(typeNotification);
          }
        }
      })
    );
  }
}

// Get element and title for add icon

locationed.addEventListener("click", (e) => {
  // found i elem for get parentElement
  if (e.target.classList.contains("icon-add")) {
    elemTarget = e.target;
    modalOpenner = elemTarget;
    flagDataSet = e.target.closest(".flip-card-inner").querySelector(".title");
  }
});

// input event for change todo value
let inputValue = document.querySelector(".input-change");
inputValue.addEventListener("keyup", (e) => {
  if (e.keyCode == 13 && inputValue.value.trim()) {
    checkButton.click();
  }
});

// submit btn for modal to add todo
checkButton.addEventListener("click", handleAddButton);

function handleAddButton(e) {
  if (inputValue.value.trim()) {
    if (e.target.classList.contains("icon-add")) {
    }

    const dataname = modalOpenner.parentElement.dataset.setName;
    userValue = inputValue.value.trim();
    let dataItem = listTodo.find((item) => {
      for (key in item.text) {
        if (key == dataname) {
          return flagDataSet.innerHTML == item.text.main;
        }
      }
    });
    console.log(dataItem.text[dataname]);

    dataItem.text[dataname] = userValue;
    localStorage.setItem("listTodo", JSON.stringify(listTodo));
    genInputValue();
  }
}

// recieve input change todo data
function genInputValue() {
  setUserTodo();
  userValue = inputValue.value.trim();

  inputValue.value = "";
}

function removeAllTodo() {

  if (confirm('با این کار تمام وظیفه های ذخیره شده حذف میگردد !!')) {
    listTodo = []
  saveToLocalStorage(listTodo)
  }
  
}

// Send input value for change value of todo and remove icon with parentElement(button)
function setUserTodo() {
  console.log(userValue);

  elemTarget.parentElement.insertAdjacentHTML("afterend", userValue);

  elemTarget.parentElement.remove();
  typeNotification = "update";
  showNotice(typeNotification);
}
function showNotice(type) {
  console.log(type);

  let listNotification = document.querySelector(".list-notification");
  let types = [
    { type: "create", color: "bg-success", text: "وظیفه با موفقیت ثبت شد" },
    { type: "fail", color: "bg-secondary", text: "عملیات با شکست مواجه شد" },
    { type: "update", color: "bg-info", text: "بروزرسانی با موفقیت انجام شد" },
    { type: "delete", color: "bg-danger", text: "وظیفه انتخابی حذف گردید" },
  ];

  let notification = types.find((notification) => notification.type === type);

  if (notification) {
    let liElem = document.createElement("li");
    liElem.className = `item-notification ${notification.color} mt-3 mx-3 p-3`;
    liElem.innerHTML = `<span class="bar"></span> <i class="bi bi-x-circle btn-close-notification fs-5"></i> ${notification.text}`;
    listNotification.append(liElem);

    liElem
      .querySelector(".btn-close-notification")
      .addEventListener("click", function (e) {
        e.target.parentElement.remove();
      });

    setTimeout(() => {
      liElem.remove();
    }, 5000);
  }
}
