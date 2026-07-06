
class MCDMEvaluator:
    """
    Aggregates multiple CriteriaHierarchies to evaluate engineering alternatives.
    """

    def __init__(self, alternatives_data: Dict[str, Dict[str, float]]):
        """
        Args:
            alternatives_data: Dict mapping Alternative Names to their DP values.
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
                if hasattr(node, 'utility_function'):
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