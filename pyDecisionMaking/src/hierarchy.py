import numpy as np
import pandas as pd
import json
import math
from collections import deque
from typing import List, Tuple, Dict, Union, Optional

from src.utility_functions import UtilityFunction, LinearUtilityFunction

class Node:
    """
    Represents a decision criterion or sub-criterion in the hierarchy.
    
    Attributes:
        name (str): Unique identifier for the node.
        local_weight (float): Relative importance of this node among its siblings.
        children (List[Node]): List of sub-criteria or design parameters.
        global_weight (float): Absolute weight calculated from the root.
        normalized_local_weight (float): local_weight / sum(sibling weights).
    """

    def __init__(self, name: str, local_weight: float = 1.0):
        self.name = name
        self.local_weight = float(local_weight)
        self.children: List['Node'] = []
        self.global_weight: float = 0.0
        self.normalized_local_weight: float = 0.0

    def add_child(self, child: 'Node') -> None:
        """
        Adds a child node to the current node.
        
        Args:
            child (Node): The node object to be added.
        """
        self.children.append(child)
        self._normalize_local_children()

    def remove_child(self, name: str) -> bool:
        """
        Removes a child node by its name identifier.
        
        Args:
            name (str): The name of the node to remove.
        Returns:
            bool: True if removed, False otherwise.
        """
        for i, child in enumerate(self.children):
            if child.name == name:
                self.children.pop(i)
                self._normalize_local_children()
                return True
        return False

    def _normalize_local_children(self) -> None:
        """
        Internal method to calculate and assign the normalized local weights 
        for all child nodes of the current node.
        
        This method sums the `local_weight` of all children and divides each 
        child's `local_weight` by this total, ensuring the sum of normalized 
        weights equals 1.0. If the total sum is 0, all children's normalized 
        weights are set to 0.0 to prevent division by zero.
        
        Args:
            None
            
        Returns:
            None: This method modifies the `normalized_local_weight` attribute 
            of the child nodes in-place.
        """
        total = sum(c.local_weight for c in self.children)
        if total > 0:
            for c in self.children:
                c.normalized_local_weight = c.local_weight / total
        else:
            for c in self.children:
                c.normalized_local_weight = 0.0

    def _serialize_data(self) -> Dict:
        """
        Internal method to return the dictionary representation of the node 
        without its children.
        """
        return {
            "name": self.name,
            "local_weight": self.local_weight,
            "type": self.__class__.__name__,
            "children": []
        }

    def to_dict(self) -> Dict:
        """
        Serializes the node and all its descendants into a nested dictionary 
        using an iterative approach (without recursion).
        
        Args:
            None
            
        Returns:
            Dict: A nested dictionary representing the hierarchy structure, 
            starting from this node and including all its children.
        """
        root_dict = self._serialize_data()
        queue = deque([(self, root_dict)])
        
        while queue:
            current_node, current_dict = queue.popleft()
            for child in current_node.children:
                child_dict = child._serialize_data()
                current_dict["children"].append(child_dict)
                queue.append((child, child_dict))
                
        return root_dict

    def __str__(self) -> str:
        lines = []
        stack = [(self, 0)]
        
        while stack:
            node, indent = stack.pop()
            prefix = "  " * indent
            children_names = [child.name for child in node.children]
            
            lines.append(
                f"{prefix}- {node.__class__.__name__}({node.name!r}): "
                f"LW={node.local_weight}, NLW={node.normalized_local_weight:.4f}, GW={node.global_weight:.4f} "
                f"| children={children_names}"
            )
            for child in reversed(node.children):
                stack.append((child, indent + 1))
                
        return "\n".join(lines)


class Criterion(Node):
    """
    Represents an evaluation criterion or sub-criterion in the decision-making hierarchy.
    Provides semantic meaning to intermediate nodes, distinguishing them from generic structural nodes.
    """

    def __init__(self, name: str, local_weight: float = 1.0, description: str = ""):
        super().__init__(name, local_weight)
        self.description = description

    def _serialize_data(self) -> Dict:
        """Serializes the criterion including its description."""
        d = super()._serialize_data()
        d.update({
            "description": self.description
        })
        return d


class Attribute(Node):
    """
    A terminal node (leaf) representing a measurable attribute in the MCDM hierarchy.
    
    Attributes cannot have children.
    """

    def __init__(self, name: str, local_weight: float, utility_function: UtilityFunction):
        super().__init__(name, local_weight)
        self.utility_function = utility_function

    def add_child(self, child: Node) -> None:
        """Overrides base method to prevent adding children to terminal nodes."""
        raise TypeError(f"Attribute '{self.name}' is a leaf node and cannot have children.")

    def remove_child(self, name: str) -> None:
        """Overrides base method to prevent operations on terminal nodes."""
        raise TypeError(f"Attribute '{self.name}' has no children to remove.")

    def _serialize_data(self) -> Dict:
        """Serializes the attribute with technical constraints without children."""
        d = super()._serialize_data()
        d["utility_function"] = self.utility_function.to_dict()
        return d


class CriteriaHierarchy:
    """
    Manages the complete hierarchical structure for a multi-criteria evaluation model.
    
    This class acts as a container for the entire decision tree, integrating main criteria, 
    sub-criteria, and terminal attributes (leaf nodes). It ensures the mathematical 
    consistency of the model by automatically calculating and updating local and global weights.

    Attributes:
        root (Node): The top-level node of the specific hierarchy.
    """

    def __init__(self, root_name: str, description: str = "Main Goal"):
        # The root of an evaluation hierarchy is conceptually the main Criterion
        self.root = Criterion(root_name, local_weight=1.0, description=description)
        self.is_evaluable: bool = False
        self.validation_errors: List[str] = []

    def find_node(self, name: str) -> Optional[Node]:
        """Iteratively searches for a node by name using BFS."""
        queue = deque([self.root])
        while queue:
            node = queue.popleft()
            if node.name == name:
                return node
            queue.extend(node.children)
        return None

    def add_to_parent(self, parent_name: str, child: Node) -> None:
        """Adds a node to a specific parent identified by name."""
        parent = self.find_node(parent_name)
        if parent:
            parent.add_child(child)
            self.update_weights()
        else:
            raise ValueError(f"Parent node '{parent_name}' not found.")

    def remove_node(self, name: str) -> bool:
        """Removes a node from the hierarchy and updates global weights."""
        queue = deque([self.root])
        while queue:
            node = queue.popleft()
            if node.remove_child(name):
                self.update_weights()
                return True
            queue.extend(node.children)
        return False

    def edit_node(self, name: str, **kwargs) -> None:
        """Edits attributes of a specific node."""
        node = self.find_node(name)
        if node:
            for key, value in kwargs.items():
                if hasattr(node, key):
                    setattr(node, key, value)
            self.update_weights()
        else:
            raise ValueError(f"Node '{name}' not found.")
            
    def validate_hierarchy(self) -> bool:
        """
        Verifies if the hierarchy is properly structured and ready for evaluation.
        Populates `self.validation_errors` with any issues found.
        """
        self.validation_errors = []
        
        if not self.root.children:
            self.validation_errors.append("The root node has no evaluation criteria.")
            
        queue = deque([self.root])
        while queue:
            node = queue.popleft()
            
            if not isinstance(node.local_weight, float) or not isinstance(node.global_weight, float):
                self.validation_errors.append(f"Weights (local/global) for node '{node.name}' must be of type float.")
                
            if node.children:
                total_nlw = sum(c.normalized_local_weight for c in node.children)
                if total_nlw > 0 and not math.isclose(total_nlw, 1.0, rel_tol=1e-5):
                    self.validation_errors.append(f"Normalized local weights of children of '{node.name}' do not sum to 1.0.")
            else:
                if not isinstance(node, Attribute):
                    self.validation_errors.append(f"Branch terminates at node '{node.name}' which is not an Attribute (valid leaf).")
                    
            if isinstance(node, Attribute):
                if not hasattr(node, 'utility_function') or not isinstance(node.utility_function, UtilityFunction):
                    self.validation_errors.append(f"Attribute '{node.name}' lacks a valid UtilityFunction.")
                    
            queue.extend(node.children)
            
        self.is_evaluable = len(self.validation_errors) == 0
        return self.is_evaluable

    def update_weights(self) -> None:
        """Iteratively calculates global weights level by level."""
        self.root.global_weight = 1.0
        queue = deque([self.root])
        while queue:
            current = queue.popleft()
            current._normalize_local_children()
            for child in current.children:
                child.global_weight = current.global_weight * child.normalized_local_weight
                queue.append(child)

    def save_to_json(self, filepath: str) -> None:
        """Exports the hierarchy to a JSON file."""
        with open(filepath, 'w') as f:
            json.dump(self.root.to_dict(), f, indent=4)

    @classmethod
    def from_dict(cls, data: Dict) -> 'CriteriaHierarchy':
        """
        Iteratively rebuilds a CriteriaHierarchy from a dictionary representation.
        Correctly handles instantiation of both Criterion and Attribute objects
        and reconstructs the hierarchy structure without recursion.
        """
        def instantiate_node(d: Dict) -> Node:
            node_type = d.get("type")
            if node_type == "Attribute":
                uf_data = d.get("utility_function")
                if uf_data:
                    uf = UtilityFunction.from_dict(uf_data)
                else: # Fallback backwards compatibility
                    uf = LinearUtilityFunction(
                        threshold=d.get("threshold", d.get("x_min", 0.0)),
                        goal=d.get("goal", d.get("x_max", 0.0))
                    )
                return Attribute(
                    name=d["name"], 
                    local_weight=d.get("local_weight", 1.0), 
                    utility_function=uf
                )
            elif node_type == "Criterion":
                return Criterion(
                    name=d["name"],
                    local_weight=d.get("local_weight", 1.0),
                    description=d.get("description", "")
                )
            return Node(name=d["name"], local_weight=d.get("local_weight", 1.0))

        hierarchy = cls(data["name"])
        root_node = instantiate_node(data)
        hierarchy.root = root_node
        
        queue = deque([(root_node, data)])
        while queue:
            current_node, current_dict = queue.popleft()
            for child_dict in current_dict.get("children", []):
                child_node = instantiate_node(child_dict)
                current_node.add_child(child_node)
                queue.append((child_node, child_dict))
                
        hierarchy.update_weights()
        return hierarchy

    @classmethod
    def load_from_json(cls, filepath: str) -> 'CriteriaHierarchy':
        """Creates a hierarchy from a JSON file."""
        with open(filepath, 'r') as f:
            data = json.load(f)
        return cls.from_dict(data)

class MCDMEvaluator:
    """
    Aggregates multiple CriteriaHierarchies to evaluate engineering alternatives.
    """

    def __init__(self, alternatives_data: Dict[str, Dict[str, float]]):
        """
        Args:
            alternatives_data: Dict mapping Alternative Names to their attribute values.
                               Example: {"Ship_A": {"Speed": 30, "Cost": 500}}
        """
        self.alternatives = alternatives_data
        self.models: Dict[str, CriteriaHierarchy] = {}

    def add_model(self, name: str, model: CriteriaHierarchy) -> None:
        self.models[name] = model

    def remove_model(self, name: str) -> None:
        if name in self.models:
            del self.models[name]

    def get_rating_matrix(self) -> pd.DataFrame:
        """Generates the consolidated rating matrix."""
        matrix = pd.DataFrame(index=self.alternatives.keys(), columns=self.models.keys())
        
        for model_name, model in self.models.items():
            model.update_weights()
            for alt_name, tech_data in self.alternatives.items():
                score = 0.0
                queue = deque([model.root])
                while queue:
                    node = queue.popleft()
                    if isinstance(node, Attribute):
                        default_val = node.utility_function.threshold if hasattr(node.utility_function, 'threshold') else 0.0
                        val = tech_data.get(node.name, default_val)
                        u = node.utility_function.evaluate(val)
                        score += u * node.global_weight
                    else:
                        queue.extend(node.children)
                matrix.at[alt_name, model_name] = score
        return matrix.astype(float)

    def export_to_excel(self, filepath: str) -> None:
        """Exports the rating matrix to an Excel file."""
        df = self.get_rating_matrix()
        df.to_excel(filepath)

    def save_evaluation_state(self, filepath: str) -> None:
        """Saves current alternatives and model metadata to JSON."""
        state = {
            "alternatives": self.alternatives,
            "models": {k: m.root.to_dict() for k, m in self.models.items()}
        }
        with open(filepath, 'w') as f:
            json.dump(state, f, indent=4)