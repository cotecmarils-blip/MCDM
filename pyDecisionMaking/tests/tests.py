import os
import sys
import unittest

tests_dir = os.path.dirname(__file__)
project_root = os.path.abspath(os.path.join(tests_dir, ".."))
sys.path.insert(0, project_root)

from src.hierarchy import Node


class TestNodeMethods(unittest.TestCase):
    def setUp(self):
        self.root = Node("Root")
        self.child_a = Node("A", local_weight=2.0)
        self.child_b = Node("B", local_weight=3.0)
        self.child_c = Node("C", local_weight=5.0)

    def test_add_child_appends_single_node(self):
        self.root.add_child(self.child_a)
        self.assertEqual(self.root.children, [self.child_a])
        
    def test_add_children_accepts_single_nodes_and_collections(self):
        self.root.add_children(self.child_a)
        self.assertEqual(self.root.children, [self.child_a])

        self.root.add_children([self.child_b, self.child_c])
        self.assertEqual(self.root.children, [self.child_a, self.child_b, self.child_c])

        self.root.add_children((Node("D"), Node("E")))
        self.assertEqual(len(self.root.children), 5)
        self.assertEqual(self.root.children[-2].name, "D")
        self.assertEqual(self.root.children[-1].name, "E")

        print(self.root)

    def test_remove_child_returns_true_when_removed(self):
        self.root.add_children(self.child_a, self.child_b)
        removed = self.root.remove_child("A")
        self.assertTrue(removed)
        self.assertEqual(self.root.children, [self.child_b])

    def test_remove_child_returns_false_when_missing(self):
        self.root.add_children(self.child_a, self.child_b)
        removed = self.root.remove_child("X")
        self.assertFalse(removed)
        self.assertEqual(self.root.children, [self.child_a, self.child_b])

    def test_normalize_local_children_sets_normalized_weights(self):
        self.root.add_children(self.child_a, self.child_b, self.child_c)
        self.root._normalize_local_children()

        total_weight = self.child_a.normalized_local_weight + self.child_b.normalized_local_weight + self.child_c.normalized_local_weight
        self.assertAlmostEqual(total_weight, 1.0)
        self.assertAlmostEqual(self.child_a.normalized_local_weight, 2.0 / 10.0)
        self.assertAlmostEqual(self.child_b.normalized_local_weight, 3.0 / 10.0)
        self.assertAlmostEqual(self.child_c.normalized_local_weight, 5.0 / 10.0)

    def test_normalize_local_children_handles_zero_total_weight(self):
        zero_a = Node("ZeroA", local_weight=0.0)
        zero_b = Node("ZeroB", local_weight=0.0)
        self.root.add_children(zero_a, zero_b)
        self.root._normalize_local_children()

        self.assertEqual(zero_a.normalized_local_weight, 0.0)
        self.assertEqual(zero_b.normalized_local_weight, 0.0)

    def test_to_dict_returns_nested_representation(self):
        child_a = Node("A", local_weight=1.0)
        child_b = Node("B", local_weight=1.0)
        self.root.add_children(child_a, child_b)
        child_a.add_child(Node("A1", local_weight=1.0))

        expected = {
            "name": "Root",
            "local_weight": 1.0,
            "type": "Node",
            "children": [
                {
                    "name": "A",
                    "local_weight": 1.0,
                    "type": "Node",
                    "children": [
                        {
                            "name": "A1",
                            "local_weight": 1.0,
                            "type": "Node",
                            "children": []
                        }
                    ]
                },
                {
                    "name": "B",
                    "local_weight": 1.0,
                    "type": "Node",
                    "children": []
                }
            ]
        }
        self.assertEqual(self.root.to_dict(), expected)


if __name__ == "__main__":
    unittest.main()
