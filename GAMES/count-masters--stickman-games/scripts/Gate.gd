extends Node3D
class_name Gate

var operation := "+"
var value := 5
var harmful := false
var consumed := false
var width := 2.55

var _panel_material: StandardMaterial3D
var _text_mesh: TextMesh


func configure(op: String, amount: int, is_harmful: bool) -> void:
	operation = op
	value = amount
	harmful = is_harmful
	if is_inside_tree():
		_build()


func _ready() -> void:
	_build()


func apply_to(current_count: int, gate_bonus: int) -> int:
	consumed = true
	visible = false
	var amount := value
	if not harmful:
		amount += gate_bonus
	match operation:
		"+":
			return current_count + amount
		"x":
			return current_count * maxi(1, amount)
		"-":
			return maxi(0, current_count - amount)
		"/":
			return maxi(0, int(floor(float(current_count) / float(maxi(1, amount)))))
	return current_count


func label_text() -> String:
	return operation + str(value)


func _build() -> void:
	for child in get_children():
		child.queue_free()
	_panel_material = StandardMaterial3D.new()
	_panel_material.albedo_color = Color(0.94, 0.12, 0.12, 0.82) if harmful else Color(0.1, 0.72, 0.95, 0.82)
	_panel_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_panel_material.roughness = 0.35
	var post_mat := StandardMaterial3D.new()
	post_mat.albedo_color = Color(0.98, 0.96, 0.84)
	post_mat.metallic = 0.1
	for x in [-width * 0.5, width * 0.5]:
		var post := MeshInstance3D.new()
		var mesh := CylinderMesh.new()
		mesh.height = 2.4
		mesh.top_radius = 0.07
		mesh.bottom_radius = 0.07
		post.mesh = mesh
		post.position = Vector3(x, 1.2, 0.0)
		post.material_override = post_mat
		add_child(post)
	var panel := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = Vector3(width, 1.45, 0.12)
	panel.mesh = box
	panel.position = Vector3(0.0, 1.25, 0.0)
	panel.material_override = _panel_material
	add_child(panel)
	var text := MeshInstance3D.new()
	_text_mesh = TextMesh.new()
	_text_mesh.text = label_text()
	_text_mesh.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_text_mesh.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_text_mesh.font_size = 62
	_text_mesh.depth = 0.03
	text.mesh = _text_mesh
	text.position = Vector3(0.0, 1.27, 0.09)
	text.scale = Vector3(0.95, 0.95, 0.95)
	var text_mat := StandardMaterial3D.new()
	text_mat.albedo_color = Color.WHITE
	text.material_override = text_mat
	add_child(text)
