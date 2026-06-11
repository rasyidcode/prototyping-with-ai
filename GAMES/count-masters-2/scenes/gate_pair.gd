extends Node3D

@onready var gate_left: Area3D = $GateLeft
@onready var gate_right: Area3D = $GateRight

func setup_pair(op_l: String, val_l: float, op_r: String, val_r: float) -> void:
	if not is_node_ready():
		await ready
	gate_left.setup_gate(op_l, val_l)
	gate_right.setup_gate(op_r, val_r)

func disable_pair() -> void:
	gate_left.deactivate()
	gate_right.deactivate()
