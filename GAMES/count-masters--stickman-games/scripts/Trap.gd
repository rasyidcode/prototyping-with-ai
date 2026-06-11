extends Node3D
class_name Trap

var damage := 8
var radius := 1.05
var consumed := false
var spin_speed := 5.5

var _blade_root: Node3D


func configure(hit_damage: int, hit_radius: float = 1.05) -> void:
	damage = hit_damage
	radius = hit_radius


func _ready() -> void:
	_build()


func _process(delta: float) -> void:
	if _blade_root:
		_blade_root.rotation.y += spin_speed * delta


func trigger(current_count: int) -> int:
	consumed = true
	return maxi(0, current_count - damage)


func _build() -> void:
	var red := StandardMaterial3D.new()
	red.albedo_color = Color(0.9, 0.04, 0.05)
	red.roughness = 0.4
	var dark := StandardMaterial3D.new()
	dark.albedo_color = Color(0.08, 0.08, 0.09)
	_blade_root = Node3D.new()
	add_child(_blade_root)
	for i in range(4):
		var blade := MeshInstance3D.new()
		var mesh := BoxMesh.new()
		mesh.size = Vector3(1.65, 0.08, 0.22)
		blade.mesh = mesh
		blade.position = Vector3(0.55, 0.28, 0.0)
		blade.rotation.y = float(i) * PI * 0.5
		blade.material_override = red
		_blade_root.add_child(blade)
	var hub := MeshInstance3D.new()
	var hub_mesh := CylinderMesh.new()
	hub_mesh.height = 0.18
	hub_mesh.top_radius = 0.28
	hub_mesh.bottom_radius = 0.28
	hub.mesh = hub_mesh
	hub.position = Vector3(0.0, 0.28, 0.0)
	hub.material_override = dark
	add_child(hub)
