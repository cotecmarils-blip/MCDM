import os
import sys
import json
import numpy as np
import matplotlib.pyplot as plt

tests_dir = os.path.dirname(__file__)
project_root = os.path.abspath(os.path.join(tests_dir, ".."))
sys.path.insert(0, project_root)

from src.hierarchy import Node, Criterion, Attribute, CriteriaHierarchy
from src.utility_functions import (
    UtilityFunction,
    LinearUtilityFunction,
    ExponentialUtilityFunction,
    LogarithmicUtilityFunction,
    SigmoidalUtilityFunction,
    DiscreteUtilityFunction
)

class NodeExamples:
    """
    Encapsulates examples for all attributes and methods of the Node class.
    Provides a logical and ordered verification of the class usage.
    """

    def __init__(self):
        print("--- Initializing NodeExamples ---")
        self.root = None

    def show_initialization(self):
        print("\n1. Showing Node Initialization and Attributes:")
        self.root = Node("RootNode", local_weight=1.0)
        print(f"Created Node: name='{self.root.name}', local_weight={self.root.local_weight}")
        print(f"Default global_weight: {self.root.global_weight}")
        print(f"Default normalized_local_weight: {self.root.normalized_local_weight}")
        print(f"Default children list: {self.root.children}")

    def show_add_child(self):
        print("\n2. Showing 'add_child' Method:")
        child1 = Node("Child_1", local_weight=3.0)
        child2 = Node("Child_2", local_weight=2.0)
        
        self.root.add_child(child1)
        self.root.add_child(child2)
        
        print(f"Added children to '{self.root.name}'. Current children count: {len(self.root.children)}")
        for child in self.root.children:
            print(f" - Child found: {child.name}")

    def show_remove_child(self):
        print("\n3. Showing 'remove_child' Method:")
        # Add a temporary child to remove
        temp_child = Node("TempChild")
        self.root.add_child(temp_child)
        print(f"Added '{temp_child.name}'. Children count: {len(self.root.children)}")
        
        # Remove existing child
        success = self.root.remove_child("TempChild")
        print(f"Attempting to remove 'TempChild'. Success? {success}. Children count: {len(self.root.children)}")
        
        # Attempt to remove non-existent child
        success_missing = self.root.remove_child("NonExistentChild")
        print(f"Attempting to remove 'NonExistentChild'. Success? {success_missing}")

    def show_normalization(self):
        print("\n4. Showing Automatic Normalization:")
        print("Since we added/removed children, the remaining weights are automatically normalized (sum to 1.0):")
        for child in self.root.children:
            print(f" - {child.name}: local_weight={child.local_weight}, normalized_local_weight={child.normalized_local_weight}")

    def show_serialization(self):
        print("\n5. Showing '_serialize_data' and 'to_dict' Methods:")
        
        print("Single node serialization (_serialize_data) without children:")
        single_node_data = self.root._serialize_data()
        print(json.dumps(single_node_data, indent=2))
        
        print("\nFull tree dictionary representation (to_dict):")
        node_dict = self.root.to_dict()
        print(json.dumps(node_dict, indent=2))

    def show_string_representation(self):
        print("\n6. Showing '__str__' Method:")
        # Adding a sub-child to show deep nesting string representation
        sub_child = Node("SubChild_1_1", local_weight=1.0)
        self.root.children[0].add_child(sub_child)
        
        print("String output of the Root Node:")
        print(self.root)

    def run_all_examples(self):
        """Executes all examples in a logical sequence."""
        self.show_initialization()
        self.show_add_child()
        self.show_remove_child()
        self.show_normalization()
        self.show_serialization()
        self.show_string_representation()
        print("\n--- Node Examples Complete ---")


class CriterionExamples:
    """
    Encapsulates examples for the Criterion class, focusing on its
    specific features like the 'description' attribute and semantic usage.
    """

    def __init__(self):
        print("\n--- Initializing CriterionExamples ---")
        self.root = None

    def show_initialization(self):
        print("\n1. Showing Criterion Initialization and Attributes:")
        self.root = Criterion("Economic", local_weight=1.0, description="Financial viability and cost factors")
        print(f"Created Criterion: name='{self.root.name}', local_weight={self.root.local_weight}")
        print(f"Description: '{self.root.description}'")

    def show_add_child(self):
        print("\n2. Showing 'add_child' Method with Sub-Criteria:")
        sub1 = Criterion("Acquisition Cost", local_weight=0.9, description="Initial purchase price")
        sub2 = Criterion("Maintenance Cost", local_weight=0.4, description="Ongoing operational costs")
        
        self.root.add_child(sub1)
        self.root.add_child(sub2)
        
        print(f"Added sub-criteria to '{self.root.name}'.")
        for child in self.root.children:
            print(f" - {child.name} (NLW: {child.normalized_local_weight:.4f}) | Desc: {child.description}")

    def show_serialization(self):
        print("\n3. Showing Serialization with Description:")
        print("Notice how the 'description' field is now seamlessly included in the output:")
        print(json.dumps(self.root.to_dict(), indent=2))

    def run_all_examples(self):
        self.show_initialization()
        self.show_add_child()
        self.show_serialization()
        print("\n--- Criterion Examples Complete ---")


class AttributeExamples:
    """
    Encapsulates examples for the Attribute class, focusing on its
    terminal node constraints and the semantic usage of threshold and goal.
    """

    def __init__(self):
        print("\n--- Initializing AttributeExamples ---")
        self.leaf = None

    def show_initialization(self):
        print("\n1. Showing Attribute Initialization:")
        # Example: Cost parameter where lower is better (threshold > goal)
        func = LinearUtilityFunction(threshold=50000.0, goal=15000.0, is_increasing=False)
        self.leaf = Attribute("Initial Price", local_weight=0.8, utility_function=func)
        print(f"Created Attribute: '{self.leaf.name}'")
        print(f"Utility Function: {self.leaf.utility_function}")

    def show_prevent_add_child(self):
        print("\n2. Showing Attribute constraint (Cannot add children to leaf nodes):")
        try:
            self.leaf.add_child(Node("InvalidChild"))
        except TypeError as e:
            print(f"Success! Caught expected TypeError: {e}")

    def show_serialization(self):
        print("\n3. Showing Serialization with Technical Constraints:")
        print("Notice how the utility_function is completely encapsulated and serialized:")
        print(json.dumps(self.leaf.to_dict(), indent=2))

    def show_all_utility_functions(self):
        print("\n4. Showing Attributes with different Utility Functions and Evaluating them:")
        
        # Linear
        func_lin = LinearUtilityFunction(threshold=0.0, goal=100.0)
        attr_lin = Attribute("Linear Attr", local_weight=1.0, utility_function=func_lin)
        print(f" - '{attr_lin.name}' created with {type(attr_lin.utility_function).__name__}")
        
        # Exponential
        func_exp = ExponentialUtilityFunction(threshold=0.0, goal=100.0, shape_parameter=2.0)
        attr_exp = Attribute("Exponential Attr", local_weight=1.0, utility_function=func_exp)
        print(f" - '{attr_exp.name}' created with {type(attr_exp.utility_function).__name__}")

        # Logarithmic
        func_log = LogarithmicUtilityFunction(threshold=0.0, goal=100.0, shape_parameter=10.0)
        attr_log = Attribute("Logarithmic Attr", local_weight=1.0, utility_function=func_log)
        print(f" - '{attr_log.name}' created with {type(attr_log.utility_function).__name__}")

        # Sigmoidal
        func_sig = SigmoidalUtilityFunction(threshold=0.0, goal=100.0, shape_parameter=10.0, midpoint=0.5)
        attr_sig = Attribute("Sigmoidal Attr", local_weight=1.0, utility_function=func_sig)
        print(f" - '{attr_sig.name}' created with {type(attr_sig.utility_function).__name__}")

        # Discrete
        func_dis = DiscreteUtilityFunction(mapping={"Low": 0.0, "Medium": 0.5, "High": 1.0})
        attr_dis = Attribute("Discrete Attr", local_weight=1.0, utility_function=func_dis)
        print(f" - '{attr_dis.name}' created with {type(attr_dis.utility_function).__name__}")

        # Evaluation of a hypothetical alternative
        print("\n   --- Evaluating a hypothetical alternative ---")
        alternative_data = {
            "Linear Attr": 50.0,
            "Exponential Attr": 50.0,
            "Logarithmic Attr": 50.0,
            "Sigmoidal Attr": 50.0,
            "Discrete Attr": "Medium"
        }
        
        for attr in [attr_lin, attr_exp, attr_log, attr_sig, attr_dis]:
            val = alternative_data.get(attr.name)
            u = attr.utility_function.evaluate(val)
            print(f"   * Evaluating '{attr.name}' with input '{val:<6}' -> Utility: {u:.4f}")

    def run_all_examples(self):
        self.show_initialization()
        self.show_prevent_add_child()
        self.show_serialization()
        self.show_all_utility_functions()
        print("\n--- Attribute Examples Complete ---")


class CriteriaHierarchyExamples:
    """
    Encapsulates examples for the CriteriaHierarchy class, demonstrating
    how to build, edit, query, and save a full evaluation tree.
    """

    def __init__(self):
        print("\n--- Initializing CriteriaHierarchyExamples ---")
        self.hierarchy = None
        self.test_json_path = os.path.join(os.path.dirname(__file__), "test_hierarchy.json")

    def show_initialization(self):
        print("\n1. Showing CriteriaHierarchy Initialization:")
        self.hierarchy = CriteriaHierarchy(root_name="Vehicle Selection", description="Choose the best vehicle")
        print(f"Hierarchy created. Root Node: {self.hierarchy.root.name}")
        print(f"Root Description: {self.hierarchy.root.description}")
        print(f"Initial Global Weight of root: {self.hierarchy.root.global_weight}")

    def show_add_nodes(self):
        print("\n2. Showing 'add_to_parent' Method (Building the tree):")
        # Adding intermediate criteria
        self.hierarchy.add_to_parent("Vehicle Selection", Criterion("Cost", local_weight=0.6))
        self.hierarchy.add_to_parent("Vehicle Selection", Criterion("Performance", local_weight=0.4))
        
        # Adding leaf nodes (Attributes) under 'Cost'
        # Note: Cost attributes usually have threshold > goal (lower is better)
        func_price = LinearUtilityFunction(threshold=50000, goal=10000, is_increasing=False)
        func_maint = LinearUtilityFunction(threshold=3000, goal=500, is_increasing=False)
        self.hierarchy.add_to_parent("Cost", Attribute("Purchase Price", local_weight=0.8, utility_function=func_price))
        self.hierarchy.add_to_parent("Cost", Attribute("Maintenance", local_weight=0.2, utility_function=func_maint))
        
        # Adding leaf nodes (Attributes) under 'Performance'
        # Note: Performance attributes usually have threshold < goal (higher is better)
        func_speed = LinearUtilityFunction(threshold=100, goal=250)
        self.hierarchy.add_to_parent("Performance", Attribute("Top Speed", local_weight=1.0, utility_function=func_speed))
        
        print("Tree built successfully. Notice the automatically updated global weights:")
        print(self.hierarchy.root)

    def show_find_and_edit(self):
        print("\n3. Showing 'find_node' and 'edit_node' Methods:")
        # Find a node
        node = self.hierarchy.find_node("Maintenance")
        print(f"Found node '{node.name}' with Local Weight: {node.local_weight}")
        
        # Edit a node (Let's increase the importance of Maintenance)
        print("Editing 'Maintenance' local_weight to 0.5...")
        self.hierarchy.edit_node("Maintenance", local_weight=0.5)
        
        node_after = self.hierarchy.find_node("Maintenance")
        print(f"After Edit - Local Weight: {node_after.local_weight}")
        print("Global weights of the whole tree adjust dynamically:")
        print(self.hierarchy.root)

    def show_json_io(self):
        print("\n4. Showing 'save_to_json' and 'load_from_json' Methods:")
        print(f"Saving hierarchy to {self.test_json_path}...")
        self.hierarchy.save_to_json(self.test_json_path)
        
        print("Loading hierarchy back into a new object...")
        loaded_hierarchy = CriteriaHierarchy.load_from_json(self.test_json_path)
        print(f"Loaded Hierarchy Root: {loaded_hierarchy.root.name} with {len(loaded_hierarchy.root.children)} main criteria.")
        
        # Clean up test file
        if os.path.exists(self.test_json_path):
            os.remove(self.test_json_path)

    def show_remove(self):
        print("\n5. Showing 'remove_node' Method:")
        print("Removing 'Top Speed' from 'Performance'...")
        self.hierarchy.remove_node("Top Speed")
        print(self.hierarchy.root)

    def show_validation(self):
        print("\n6. Showing 'validate_hierarchy' Method:")
        print("Currently, 'Performance' branch has no attributes (we just removed 'Top Speed').")
        
        is_valid = self.hierarchy.validate_hierarchy()
        print(f"Is the hierarchy valid for evaluation? {is_valid}")
        if not is_valid:
            print("Validation Errors Found:")
            for error in self.hierarchy.validation_errors:
                print(f" - {error}")
        
        print("\nFixing the hierarchy by adding an attribute back to 'Performance'...")
        func_accel = ExponentialUtilityFunction(threshold=15, goal=3, is_increasing=False)
        self.hierarchy.add_to_parent("Performance", Attribute("Acceleration", local_weight=1.0, utility_function=func_accel))
        is_valid_now = self.hierarchy.validate_hierarchy()
        print(f"Is the hierarchy valid for evaluation now? {is_valid_now}")


    def run_all_examples(self):
        self.show_initialization()
        self.show_add_nodes()
        self.show_find_and_edit()
        self.show_json_io()
        self.show_remove()
        self.show_validation()
        print("\n--- CriteriaHierarchy Examples Complete ---")


class UtilityFunctionExamples:
    """
    Encapsulates examples for all utility functions, demonstrating
    initialization, evaluation, serialization, and plotting independently.
    """

    def __init__(self):
        print("\n--- Initializing UtilityFunctionExamples ---")

    def show_linear(self):
        print("\n1. Showing Linear Utility Function:")
        # Increasing linear function from 10 to 50
        func = LinearUtilityFunction(threshold=10.0, goal=50.0, is_increasing=True)
        val = 30.0  # Exactly in the middle
        print(f" - Evaluated at x={val} -> Utility: {func.evaluate(val):.4f} (Expected: ~0.5000)")
        func.plot(title="Linear Utility Example")  # Uncomment to view the plot visually

    def show_exponential(self):
        print("\n2. Showing Exponential Utility Function:")
        # Decreasing exponential function (e.g., lower cost is better)
        func = ExponentialUtilityFunction(
            threshold=100.0, goal=0.0, is_increasing=False, shape_parameter=2.0
        )
        val = 75.0
        print(f" - Evaluated at x={val} -> Utility: {func.evaluate(val):.4f}")
        func.plot(title="Exponential Utility Example (Decreasing)")

    def show_logarithmic(self):
        print("\n3. Showing Logarithmic Utility Function:")
        func = LogarithmicUtilityFunction(
            threshold=0.0, goal=100.0, is_increasing=True, shape_parameter=10.0
        )
        val = 25.0
        print(f" - Evaluated at x={val} -> Utility: {func.evaluate(val):.4f} (Rises quickly early on)")
        func.plot(title="Logarithmic Utility Example")

    def show_sigmoidal(self):
        print("\n4. Showing Sigmoidal (S-Curve) Utility Function:")
        func = SigmoidalUtilityFunction(
            threshold=0.0, goal=100.0, is_increasing=True, 
            shape_parameter=10.0, midpoint=0.5
        )
        val = 50.0 # Exactly at the midpoint
        print(f" - Evaluated at x={val} -> Utility: {func.evaluate(val):.4f} (Expected: ~0.5000)")
        func.plot(title="Sigmoidal Utility Example")

    def show_discrete(self):
        print("\n5. Showing Discrete Utility Function:")
        mapping = {"Excellent": 1.0, "Good": 0.7, "Average": 0.4, "Poor": 0.0}
        func = DiscreteUtilityFunction(mapping=mapping)
        
        val1, val2 = "Good", "Unknown"
        print(f" - Evaluated at category '{val1}' -> Utility: {func.evaluate(val1):.4f}")
        print(f" - Evaluated at category '{val2}' -> Utility: {func.evaluate(val2):.4f} (Fallback for unknown)")
        func.plot(title="Discrete Utility Example")

    def show_serialization(self):
        print("\n6. Showing Utility Function Serialization (to_dict & from_dict):")
        original_func = SigmoidalUtilityFunction(0, 100, shape_parameter=15.0)
        
        serialized_data = original_func.to_dict()
        print(" - Serialized Dictionary:")
        print(json.dumps(serialized_data, indent=2))
        
        rebuilt_func = UtilityFunction.from_dict(serialized_data)
        print(f" - Rebuilt Function Type: {type(rebuilt_func).__name__}")
        print(f" - Rebuilt Evaluation at 50: {rebuilt_func.evaluate(50):.4f}")

    def show_all_plots_together(self):
        print("\n7. Showing all utility functions plotted together in a single image:")
        fig, axes = plt.subplots(2, 3, figsize=(14, 8))
        fig.suptitle("Utility Functions Overview", fontsize=16)
        
        x = np.linspace(10, 50, 100)
        
        # 1. Linear
        f_lin = LinearUtilityFunction(threshold=10, goal=50)
        axes[0, 0].plot(x, [f_lin.evaluate(val) for val in x], color='blue', lw=2)
        axes[0, 0].set_title("Linear")
        axes[0, 0].grid(True, linestyle=":", alpha=0.7)
        
        # 2. Exponential
        f_exp = ExponentialUtilityFunction(threshold=10, goal=50, shape_parameter=2.0)
        axes[0, 1].plot(x, [f_exp.evaluate(val) for val in x], color='green', lw=2)
        axes[0, 1].set_title("Exponential (shape=2.0)")
        axes[0, 1].grid(True, linestyle=":", alpha=0.7)
        
        # 3. Logarithmic
        f_log = LogarithmicUtilityFunction(threshold=10, goal=50, shape_parameter=10.0)
        axes[0, 2].plot(x, [f_log.evaluate(val) for val in x], color='red', lw=2)
        axes[0, 2].set_title("Logarithmic (shape=10.0)")
        axes[0, 2].grid(True, linestyle=":", alpha=0.7)
        
        # 4. Sigmoidal
        f_sig = SigmoidalUtilityFunction(threshold=10, goal=50, shape_parameter=10.0, midpoint=0.5)
        axes[1, 0].plot(x, [f_sig.evaluate(val) for val in x], color='purple', lw=2)
        axes[1, 0].set_title("Sigmoidal (shape=10.0, mid=0.5)")
        axes[1, 0].grid(True, linestyle=":", alpha=0.7)
        
        # 5. Discrete
        mapping = {"Poor": 0.0, "Average": 0.4, "Good": 0.7, "Excellent": 1.0}
        f_dis = DiscreteUtilityFunction(mapping=mapping)
        cats = list(mapping.keys())
        vals = list(mapping.values())
        axes[1, 1].bar(cats, vals, color='orange', edgecolor='black')
        axes[1, 1].set_title("Discrete")
        axes[1, 1].set_ylim(0, 1.1)
        axes[1, 1].grid(axis='y', linestyle='--', alpha=0.7)
        
        # Hide the last empty subplot
        axes[1, 2].axis('off')
        
        plt.tight_layout()
        print(" - Displaying plot window. Close the window to continue...")
        plt.show()

    def show_evaluation_verification(self):
        print("\n8. Verifying evaluation of an alternative using all available utility functions:")
        # Define a hypothetical alternative
        alternative = {
            "Price": 30000.0,
            "Lifespan": 12.0,
            "TopSpeed": 160.0,
            "Comfort": 6.5,
            "Brand": "Good"
        }
        print("Alternative data to evaluate:")
        print(json.dumps(alternative, indent=2))
        
        # Define utility functions for each attribute (mixing increasing and decreasing)
        functions = {
            "Price": LinearUtilityFunction(threshold=50000.0, goal=15000.0, is_increasing=False),
            "Lifespan": LogarithmicUtilityFunction(threshold=5.0, goal=20.0, shape_parameter=10.0),
            "TopSpeed": ExponentialUtilityFunction(threshold=100.0, goal=200.0, shape_parameter=2.0),
            "Comfort": SigmoidalUtilityFunction(threshold=1.0, goal=10.0, shape_parameter=10.0, midpoint=0.5),
            "Brand": DiscreteUtilityFunction(mapping={"Excellent": 1.0, "Good": 0.8, "Average": 0.5, "Poor": 0.0})
        }
        
        print("\nEvaluation Results:")
        for attr, val in alternative.items():
            func = functions.get(attr)
            if func:
                u = func.evaluate(val)
                print(f" - {attr:<10} | Input: {val:<8} | Utility: {u:.4f} | Function: {type(func).__name__}")

    def run_all_examples(self):
        #self.show_linear()
        #self.show_exponential()
        #self.show_logarithmic()
        #self.show_sigmoidal()
        #self.show_discrete()
        #self.show_serialization()
        #self.show_all_plots_together()
        self.show_evaluation_verification()
        print("\n--- Utility Function Examples Complete ---")


if __name__ == "__main__":
    #examples = NodeExamples()
    #examples.run_all_examples()
    
    #criterion_examples = CriterionExamples()
    #criterion_examples.run_all_examples()

    attribute_examples = AttributeExamples()
    attribute_examples.run_all_examples()

    #utility_examples = UtilityFunctionExamples()
    #utility_examples.run_all_examples()

    #hierarchy_examples = CriteriaHierarchyExamples()
    #hierarchy_examples.run_all_examples()
