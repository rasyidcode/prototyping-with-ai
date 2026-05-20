const storageKey = "simple-hr-system-data-v1";

const state = {
  employees: [],
  leaves: [],
};

const employeeForm = document.getElementById("employeeForm");
const leaveForm = document.getElementById("leaveForm");
const employeeTable = document.getElementById("employeeTable");
const leaveTable = document.getElementById("leaveTable");
const employeeSelect = document.getElementById("employeeSelect");
const leaveFilter = document.getElementById("leaveFilter");
const searchEmployees = document.getElementById("searchEmployees");
const seedBtn = document.getElementById("seedBtn");

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function loadState() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.employees = parsed.employees || [];
    state.leaves = parsed.leaves || [];
  } catch {
    state.employees = [];
    state.leaves = [];
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function fmtDate(value) {
  return value || "-";
}

function renderStats() {
  document.getElementById("totalEmployees").textContent = state.employees.length;

  const pending = state.leaves.filter((l) => l.status === "Pending").length;
  const approved = state.leaves.filter((l) => l.status === "Approved").length;
  const rejected = state.leaves.filter((l) => l.status === "Rejected").length;

  document.getElementById("pendingLeaves").textContent = pending;
  document.getElementById("approvedLeaves").textContent = approved;
  document.getElementById("rejectedLeaves").textContent = rejected;
}

function renderEmployeeSelect() {
  const current = employeeSelect.value;
  const options = [
    '<option value="">Select employee</option>',
    ...state.employees.map(
      (e) => `<option value="${e.id}">${e.name} (${e.department})</option>`
    ),
  ];
  employeeSelect.innerHTML = options.join("");
  employeeSelect.value = current;
}

function renderEmployees() {
  const query = searchEmployees.value.trim().toLowerCase();
  const filtered = state.employees.filter((e) => {
    if (!query) return true;
    return (
      e.name.toLowerCase().includes(query) ||
      e.department.toLowerCase().includes(query)
    );
  });

  if (!filtered.length) {
    employeeTable.innerHTML =
      '<tr><td colspan="6">No employees found.</td></tr>';
    return;
  }

  employeeTable.innerHTML = filtered
    .map(
      (e) => `
      <tr>
        <td>${e.name}</td>
        <td>${e.email}</td>
        <td>${e.role}</td>
        <td>${e.department}</td>
        <td>${fmtDate(e.joinDate)}</td>
        <td>
          <div class="actions">
            <button data-edit-employee="${e.id}" class="secondary">Edit</button>
            <button data-delete-employee="${e.id}" class="danger">Delete</button>
          </div>
        </td>
      </tr>
    `
    )
    .join("");
}

function renderLeaves() {
  const filter = leaveFilter.value;
  const rows = state.leaves
    .filter((l) => filter === "All" || l.status === filter)
    .map((l) => {
      const employee = state.employees.find((e) => e.id === l.employeeId);
      const statusClass = l.status.toLowerCase();
      return `
        <tr>
          <td>${employee ? employee.name : "Removed employee"}</td>
          <td>${l.type}</td>
          <td>${fmtDate(l.start)}</td>
          <td>${fmtDate(l.end)}</td>
          <td>${l.reason}</td>
          <td><span class="badge ${statusClass}">${l.status}</span></td>
          <td>
            <div class="actions">
              <button data-approve-leave="${l.id}" class="ok">Approve</button>
              <button data-reject-leave="${l.id}" class="danger">Reject</button>
              <button data-delete-leave="${l.id}" class="secondary">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });

  leaveTable.innerHTML = rows.length
    ? rows.join("")
    : '<tr><td colspan="7">No leave requests found.</td></tr>';
}

function render() {
  renderStats();
  renderEmployeeSelect();
  renderEmployees();
  renderLeaves();
}

employeeForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const payload = {
    id: uid(),
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    role: document.getElementById("role").value.trim(),
    department: document.getElementById("department").value.trim(),
    joinDate: document.getElementById("joinDate").value,
  };

  state.employees.push(payload);
  saveState();
  employeeForm.reset();
  render();
});

leaveForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const employeeId = document.getElementById("employeeSelect").value;
  const start = document.getElementById("leaveStart").value;
  const end = document.getElementById("leaveEnd").value;

  if (end < start) {
    alert("Leave end date cannot be before start date.");
    return;
  }

  state.leaves.push({
    id: uid(),
    employeeId,
    start,
    end,
    type: document.getElementById("leaveType").value,
    reason: document.getElementById("leaveReason").value.trim(),
    status: "Pending",
  });

  saveState();
  leaveForm.reset();
  render();
});

employeeTable.addEventListener("click", (event) => {
  const editId = event.target.dataset.editEmployee;
  const deleteId = event.target.dataset.deleteEmployee;

  if (editId) {
    const employee = state.employees.find((e) => e.id === editId);
    if (!employee) return;

    const name = prompt("Name", employee.name);
    if (name === null) return;
    const email = prompt("Email", employee.email);
    if (email === null) return;
    const role = prompt("Role", employee.role);
    if (role === null) return;
    const department = prompt("Department", employee.department);
    if (department === null) return;

    employee.name = name.trim() || employee.name;
    employee.email = email.trim() || employee.email;
    employee.role = role.trim() || employee.role;
    employee.department = department.trim() || employee.department;

    saveState();
    render();
  }

  if (deleteId) {
    if (!confirm("Delete this employee?")) return;
    state.employees = state.employees.filter((e) => e.id !== deleteId);
    state.leaves = state.leaves.filter((l) => l.employeeId !== deleteId);
    saveState();
    render();
  }
});

leaveTable.addEventListener("click", (event) => {
  const approveId = event.target.dataset.approveLeave;
  const rejectId = event.target.dataset.rejectLeave;
  const deleteId = event.target.dataset.deleteLeave;

  if (approveId) {
    const leave = state.leaves.find((l) => l.id === approveId);
    if (!leave) return;
    leave.status = "Approved";
  }

  if (rejectId) {
    const leave = state.leaves.find((l) => l.id === rejectId);
    if (!leave) return;
    leave.status = "Rejected";
  }

  if (deleteId) {
    state.leaves = state.leaves.filter((l) => l.id !== deleteId);
  }

  saveState();
  render();
});

leaveFilter.addEventListener("change", renderLeaves);
searchEmployees.addEventListener("input", renderEmployees);

seedBtn.addEventListener("click", () => {
  if (!confirm("This will replace current data with demo data. Continue?")) return;

  const e1 = {
    id: uid(),
    name: "Ava Johnson",
    email: "ava.johnson@company.com",
    role: "Software Engineer",
    department: "Engineering",
    joinDate: "2024-02-10",
  };
  const e2 = {
    id: uid(),
    name: "Liam Carter",
    email: "liam.carter@company.com",
    role: "HR Generalist",
    department: "Human Resources",
    joinDate: "2023-10-01",
  };

  state.employees = [e1, e2];
  state.leaves = [
    {
      id: uid(),
      employeeId: e1.id,
      start: "2026-03-10",
      end: "2026-03-14",
      type: "Annual",
      reason: "Family vacation",
      status: "Pending",
    },
    {
      id: uid(),
      employeeId: e2.id,
      start: "2026-02-20",
      end: "2026-02-21",
      type: "Sick",
      reason: "Flu",
      status: "Approved",
    },
  ];

  saveState();
  render();
});

loadState();
render();
