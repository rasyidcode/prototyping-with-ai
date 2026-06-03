extends Node3D
class_name Crowd

const DISPLAY_LIMIT = 72

var count := 1
var accent := Color.WHITE
var is_enemy := false
var radius := 1.0
var wobble := 0.0

var _visual_root: Node3D
var _count_mesh: MeshInstance3D
var _count_text: TextMesh
var _last_display_count := -1
var _body_material: StandardMaterial3D
var _head_material: StandardMaterial3D
var _dark_material: StandardMaterial3D


func _ready() -> void:
	_visual_root = Node3D.new()
	add_child(_visual_root)
	_count_mesh = MeshInstance3D.new()
	_count_text = TextMesh.new()
	_count_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_count_text.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_count_text.font_size = 44
	_count_text.depth = 0.02
	_count_mesh.mesh = _count_text
	_count_mesh.position = Vector3(0.0, 2.45, 0.0)
	_count_mesh.rotation_degrees = Vector3(-25.0, 0.0, 0.0)
	add_child(_count_mesh)
	_refresh_materials()
	set_count(count)


func setup(start_count: int, color: Color, enemy: bool = false) -> void:
	count = maxi(0, start_count)
	accent = color
	is_enemy = enemy
	if is_inside_tree():
		_refresh_materials()
		set_count(count)


func set_count(value: int) -> void:
	count = maxi(0, value)
	radius = clampf(0.7 + sqrt(float(maxi(count, 1))) * 0.18, 0.9, 3.0)
	if _count_text:
		_count_text.text = str(count)
		_count_mesh.visible = count > DISPLAY_LIMIT
	var display_count: int = mini(count, DISPLAY_LIMIT)
	if display_count != _last_display_count:
		_last_display_count = display_count
		_rebuild_stickmen(display_count)


func change_count(delta: int) -> void:
	set_count(count + delta)


func pulse() -> void:
	var tween := create_tween()
	tween.tween_property(self, "scale", Vector3(1.14, 1.14, 1.14), 0.08)
	tween.tween_property(self, "scale", Vector3.ONE, 0.12)


func _process(delta: float) -> void:
	wobble += delta * 8.0
	if _visual_root:
		var i := 0
		for child in _visual_root.get_children():
			child.position.y = sin(wobble + float(i) * 0.47) * 0.035
			i += 1


func _refresh_materials() -> void:
	_body_material = StandardMaterial3D.new()
	_body_material.albedo_color = accent
	_body_material.roughness = 0.55
	_head_material = StandardMaterial3D.new()
	_head_material.albedo_color = accent.lightened(0.22)
	_head_material.roughness = 0.5
	_dark_material = StandardMaterial3D.new()
	_dark_material.albedo_color = Color(0.06, 0.07, 0.08)
	_dark_material.roughness = 0.7
	if _count_mesh:
		_count_mesh.material_override = _dark_material


func _rebuild_stickmen(display_count: int) -> void:
	if not _visual_root:
		return
	for child in _visual_root.get_children():
		child.queue_free()
	if display_count <= 0:
		return
	for i in range(display_count):
		var stickman := _make_stickman()
		stickman.position = _formation_position(i, display_count)
		_visual_root.add_child(stickman)


func _formation_position(index: int, total: int) -> Vector3:
	var cols: int = maxi(1, int(ceil(sqrt(float(total)))))
	var row := index / cols
	var col := index % cols
	var rows: int = maxi(1, int(ceil(float(total) / float(cols))))
	var spacing := 0.48
	var x := (float(col) - float(cols - 1) * 0.5) * spacing
	var z := (float(row) - float(rows - 1) * 0.5) * spacing
	return Vector3(x, 0.0, z)


func _make_stickman() -> Node3D:
	var root := Node3D.new()
	root.scale = Vector3(0.72, 0.72, 0.72)
	root.add_child(_mesh(SphereMesh.new(), Vector3(0.0, 1.26, 0.0), Vector3(0.18, 0.18, 0.18), _head_material))
	root.add_child(_capsule(Vector3(0.0, 0.78, 0.0), Vector3(0.16, 0.24, 0.16), _body_material))
	root.add_child(_limb(Vector3(-0.18, 0.86, 0.0), Vector3(0.05, 0.34, 0.05), Vector3(0.0, 0.0, -28.0)))
	root.add_child(_limb(Vector3(0.18, 0.86, 0.0), Vector3(0.05, 0.34, 0.05), Vector3(0.0, 0.0, 28.0)))
	root.add_child(_limb(Vector3(-0.09, 0.36, 0.0), Vector3(0.055, 0.42, 0.055), Vector3(0.0, 0.0, 15.0)))
	root.add_child(_limb(Vector3(0.09, 0.36, 0.0), Vector3(0.055, 0.42, 0.055), Vector3(0.0, 0.0, -15.0)))
	return root


func _capsule(pos: Vector3, scl: Vector3, mat: Material) -> MeshInstance3D:
	var capsule := CapsuleMesh.new()
	capsule.radius = 0.5
	capsule.height = 1.0
	return _mesh(capsule, pos, scl, mat)


func _limb(pos: Vector3, scl: Vector3, rot: Vector3) -> MeshInstance3D:
	var limb := _capsule(pos, scl, _dark_material if is_enemy else _body_material)
	limb.rotation_degrees = rot
	return limb


func _mesh(mesh: Mesh, pos: Vector3, scl: Vector3, mat: Material) -> MeshInstance3D:
	var item := MeshInstance3D.new()
	item.mesh = mesh
	item.position = pos
	item.scale = scl
	item.material_override = mat
	return item
