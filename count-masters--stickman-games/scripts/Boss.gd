extends Node3D
class_name Boss

var health := 120
var defeated := false
var radius := 2.1

var _health_text: TextMesh
var _body: Node3D


func configure(start_health: int) -> void:
	health = start_health
	if is_inside_tree():
		_update_text()


func _ready() -> void:
	_build()
	_update_text()


func fight(player_count: int) -> Dictionary:
	defeated = true
	var survivors := player_count - health
	if survivors > 0:
		visible = false
		return {"player": survivors, "boss": 0, "won": true}
	health = abs(survivors)
	_update_text()
	return {"player": 0, "boss": health, "won": false}


func _process(delta: float) -> void:
	if _body:
		_body.rotation.y += delta * 0.75


func _build() -> void:
	_body = Node3D.new()
	add_child(_body)
	var gold := StandardMaterial3D.new()
	gold.albedo_color = Color(1.0, 0.72, 0.08)
	gold.metallic = 0.2
	var black := StandardMaterial3D.new()
	black.albedo_color = Color(0.05, 0.04, 0.04)
	var red := StandardMaterial3D.new()
	red.albedo_color = Color(0.8, 0.05, 0.05)
	_body.add_child(_mesh(SphereMesh.new(), Vector3(0.0, 2.65, 0.0), Vector3(0.48, 0.48, 0.48), gold))
	_body.add_child(_mesh(CapsuleMesh.new(), Vector3(0.0, 1.55, 0.0), Vector3(0.56, 0.95, 0.56), red))
	_body.add_child(_limb(Vector3(-0.58, 1.75, 0.0), Vector3(0.14, 0.85, 0.14), Vector3(0.0, 0.0, -32.0), black))
	_body.add_child(_limb(Vector3(0.58, 1.75, 0.0), Vector3(0.14, 0.85, 0.14), Vector3(0.0, 0.0, 32.0), black))
	_body.add_child(_limb(Vector3(-0.28, 0.72, 0.0), Vector3(0.15, 0.95, 0.15), Vector3(0.0, 0.0, 12.0), black))
	_body.add_child(_limb(Vector3(0.28, 0.72, 0.0), Vector3(0.15, 0.95, 0.15), Vector3(0.0, 0.0, -12.0), black))
	var crown := MeshInstance3D.new()
	var crown_mesh := CylinderMesh.new()
	crown_mesh.top_radius = 0.42
	crown_mesh.bottom_radius = 0.42
	crown_mesh.height = 0.22
	crown.mesh = crown_mesh
	crown.position = Vector3(0.0, 3.08, 0.0)
	crown.material_override = gold
	_body.add_child(crown)
	var label := MeshInstance3D.new()
	_health_text = TextMesh.new()
	_health_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_health_text.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_health_text.font_size = 56
	_health_text.depth = 0.03
	label.mesh = _health_text
	label.position = Vector3(0.0, 3.55, 0.0)
	label.rotation_degrees = Vector3(-25.0, 0.0, 0.0)
	add_child(label)


func _update_text() -> void:
	if _health_text:
		_health_text.text = "KING " + str(health)


func _limb(pos: Vector3, scl: Vector3, rot: Vector3, mat: Material) -> MeshInstance3D:
	var capsule := CapsuleMesh.new()
	capsule.radius = 0.5
	capsule.height = 1.0
	var item := _mesh(capsule, pos, scl, mat)
	item.rotation_degrees = rot
	return item


func _mesh(mesh: Mesh, pos: Vector3, scl: Vector3, mat: Material) -> MeshInstance3D:
	var item := MeshInstance3D.new()
	item.mesh = mesh
	item.position = pos
	item.scale = scl
	item.material_override = mat
	return item
