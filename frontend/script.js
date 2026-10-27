const API_URL = 'http://localhost:3000';
const $ = id => document.getElementById(id);

let courses = [];
let students = [];

// Generic API helper: returns parsed JSON, or null for empty responses
async function api(path, method = 'GET', body) {
  const res = await fetch(API_URL + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Load and render

const actionButtons = id => `
  <td>
    <button data-action="edit" data-id="${id}">Edit</button>
    <button class="danger" data-action="delete" data-id="${id}">Delete</button>
  </td>`;

async function load() {
  [courses, students] = await Promise.all([api('/cursos'), api('/alunos')]);

  // Fill the course select in the student modal
  $('course-select').innerHTML = courses
    .map(c => `<option value="${c.id}">${c.nomeDoCurso}</option>`)
    .join('');

  // Render courses table
  $('course-list').innerHTML = courses
    .map(c => `<tr><td>${c.nomeDoCurso}</td>${actionButtons(c.id)}</tr>`)
    .join('');

  // Render students table
  $('student-list').innerHTML = students.map(s => {
    const course = courses.find(c => c.id === s.idCurso);
    return `<tr>
      <td>${s.nome}</td>
      <td>${s.apelido}</td>
      <td>${course ? course.nomeDoCurso : 'Unknown'}</td>
      <td>${s.anoCurricular}</td>
      ${actionButtons(s.id)}
    </tr>`;
  }).join('');
}

// Generic modal (add / edit)

function openModal(modal, title, data = {}) {
  const form = modal.querySelector('form');
  form.reset();
  form.dataset.id = data.id ?? ''; // empty id = add mode, otherwise edit mode

  // Pre-fill fields whose name matches a property of the data
  for (const field of form.elements) {
    if (field.name in data) field.value = data[field.name];
  }

  modal.querySelector('h2').textContent = title;
  modal.showModal();
}

// Wires up the modal, form submit and table actions for one resource
function setup({ modal, table, resource, getList, label, newButton, transform = d => d }) {
  const form = modal.querySelector('form');

  newButton.addEventListener('click', () => openModal(modal, `Add ${label}`));

  modal.querySelector('[data-close]').addEventListener('click', () => modal.close());

  // Create or update, depending on whether the form has an id
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const id = form.dataset.id;
    const data = transform(Object.fromEntries(new FormData(form)));
    await api(id ? `/${resource}/${id}` : `/${resource}`, id ? 'PUT' : 'POST', data);
    modal.close();
    await load();
  });

  // Edit / delete buttons (event delegation)
  table.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;

    if (btn.dataset.action === 'edit') {
      openModal(modal, `Edit ${label}`, getList().find(item => String(item.id) === id));
    } else if (confirm(`Are you sure you want to delete this ${label.toLowerCase()}?`)) {
      await api(`/${resource}/${id}`, 'DELETE');
      await load();
    }
  });
}

setup({
  modal: $('modal-student'),
  table: $('student-list'),
  resource: 'alunos',
  getList: () => students,
  label: 'Student',
  newButton: $('btn-new-student'),
  transform: d => ({ ...d, anoCurricular: Number(d.anoCurricular) })
});

setup({
  modal: $('modal-course'),
  table: $('course-list'),
  resource: 'cursos',
  getList: () => courses,
  label: 'Course',
  newButton: $('btn-new-course')
});

load();