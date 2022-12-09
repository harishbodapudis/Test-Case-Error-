const express = require("express");
const app = express();

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const isValid = require("date-fns/isValid");

const path = require("path");
const pathDb = path.join(__dirname, "todoApplication.db");

app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: pathDb,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB error at ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

//middleware function
const checkValues = (request, response, next) => {
  let priorityValues = ["HIGH", "LOW", "MEDIUM"];
  let statusValues = ["TO DO", "IN PROGRESS", "DONE"];
  let categoryValues = ["WORK", "HOME", "LEARNING"];
  let reqType = null;
  if (request.method == "PUT" || request.method == "POST") {
    reqType = request.body;
  } else {
    reqType = request.query;
  }
  let {
    search_q = "",
    category = "",
    priority = "",
    status = "",
    date = "",
    dueDate = "",
  } = reqType;
  let condition = true;

  if (priority) {
    let priorityCheck = priorityValues.some((value) => value == priority);
    if (!priorityCheck) {
      response.status(400);
      response.send("Invalid Todo Priority");
      condition = false;
    }
  }
  if (status) {
    let statusCheck = statusValues.some((value) => value == status);
    if (!statusCheck) {
      response.status(400);
      response.send("Invalid Todo Status");
      condition = false;
    }
  }
  if (category) {
    let categoryCheck = categoryValues.some((value) => value == category);
    if (!categoryCheck) {
      response.status(400);
      response.send("Invalid Todo Category");
      condition = false;
    }
  }
  if (date || dueDate) {
    if (dueDate) {
      date = dueDate;
    }
    const dateStatus = isValid(new Date(date));
    if (!dateStatus) {
      response.status(400);
      response.send("Invalid Due Date");
      condition = false;
    }
  }
  if (condition) {
    next();
  }
};

//API 1
app.get("/todos/", checkValues, async (request, response) => {
  const {
    search_q = "",
    category = "",
    priority = "",
    status = "",
  } = request.query;
  let checkTodoDb = `SELECT 
            id AS id,
            todo AS todo,
            priority AS priority,
            status AS status,
            category AS category,
            due_date AS dueDate
        FROM 
            todo `;

  if (priority && status) {
    checkTodoDb += ` 
        WHERE 
            status = '${status}' AND priority = '${priority}';
        `;
  } else if (category && status) {
    checkTodoDb += `
        WHERE 
            category = '${category}' AND status ='${status}';
    `;
  } else if (category && priority) {
    checkTodoDb += ` 
        WHERE 
            category = '${category}' AND priority = '${priority}';
      `;
  } else if (status) {
    checkTodoDb += `
        WHERE 
            status = '${status}';
      `;
  } else if (priority) {
    checkTodoDb += ` 
        WHERE 
             priority = '${priority}';
      `;
  } else if (search_q) {
    checkTodoDb += ` 
        WHERE 
            todo LIKE '%${search_q}%';
      `;
  } else if (category) {
    checkTodoDb += `
        WHERE 
            category = '${category}';
      `;
  }
  const allTodos = await db.all(checkTodoDb);
  response.send(allTodos);
});

//API 2
app.get("/todos/:todoId/", checkValues, async (request, response) => {
  const { todoId } = request.params;
  let checkTodoDb = `SELECT 
            id AS id,
            todo AS todo,
            priority AS priority,
            status AS status,
            category AS category,
            due_date AS dueDate
        FROM 
            todo `;
  checkTodoDb += `
    WHERE 
        id = ${todoId};
  `;
  const allTodos = await db.get(checkTodoDb);
  response.send(allTodos);
});

//API 3
app.get("/agenda/", checkValues, async (request, response) => {
  let { date } = request.query;
  let dateValue = new Date(date);
  let year = dateValue.getFullYear();
  let month = dateValue.getMonth() + 1;
  let day = dateValue.getDate();
  month = month < 10 ? "0" + month : month;
  day = day < 10 ? "0" + day : day;
  date = year + "-" + month + "-" + day;
  let checkTodoDb = `SELECT 
            id AS id,
            todo AS todo,
            priority AS priority,
            status AS status,
            category AS category,
            due_date AS dueDate
        FROM 
            todo `;

  checkTodoDb += `
    WHERE 
        due_date = '${date}';
  `;
  const allTodos = await db.all(checkTodoDb);
  response.send(allTodos);
});

//API 4
app.post("/todos/", checkValues, async (request, response) => {
  const todoDataToPost = request.body;
  const { id, todo, priority, status, category, dueDate } = todoDataToPost;
  const checkDatabase = `SELECT * FROM todo WHERE id = ${id} OR todo = '${todo}'`;
  const checkTable = await db.get(checkDatabase);

  if (checkTable == undefined) {
    const newTodoData = `
            INSERT INTO 
                todo (id,todo,priority,status,category,due_date)
            VALUES (${id},'${todo}','${priority}','${status}','${category}','${dueDate}');
        `;
    const updatedData = await db.run(newTodoData);
    console.log(updatedData);
    response.send("Todo Successfully Added");
  } else {
    response.status(400);
    response.send("Todo Item Already Exists");
  }
});

app.put("/todos/:todoId/", checkValues, async (request, response) => {
  const { todoId } = request.params;
  const { status, priority, todo, category, dueDate } = request.body;
  let updateTodo = `
        UPDATE 
            todo
        SET 
             
    `;
  if (status) {
    updateTodo += `
            status = '${status}'
            WHERE 
                id = ${todoId};
        `;
    await db.run(updateTodo);
    response.send("Status Updated");
  } else if (priority) {
    updateTodo += `
            priority = '${priority}'
            WHERE 
                id = ${todoId};
        `;
    await db.run(updateTodo);
    response.send("Priority Updated");
  } else if (todo) {
    updateTodo += `
            todo = '${todo}'
            WHERE 
                id = ${todoId};
        `;
    await db.run(updateTodo);
    response.send("Todo Updated");
  } else if (category) {
    updateTodo += `
            category = '${category}'
            WHERE 
                id = ${todoId};
        `;
    await db.run(updateTodo);
    response.send("Category Updated");
  } else if (dueDate) {
    let dateValue = new Date(dueDate);
    let year = dateValue.getFullYear();
    let month = dateValue.getMonth() + 1;
    let day = dateValue.getDate();
    month = month < 10 ? "0" + month : month;
    day = day < 10 ? "0" + day : day;
    date = year + "-" + month + "-" + day;

    updateTodo += `
            due_date = '${dueDate}'
            WHERE 
                id = ${todoId};
        `;
    await db.run(updateTodo);
    response.send("Due Date Updated");
  }
});

//API 6
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const removeTodoData = `
        DELETE FROM 
            todo
        WHERE 
            id = ${todoId};
    `;
  await db.run(removeTodoData);
  response.send("Todo Deleted");
});

module.exports = app;
